# 1. 환경 구성
1. 기본 변수 설정
```
$ AWS_REGION=us-west-2
```
2. AWS CLI 계정 확인
```
$ aws sts get-caller-identity
$ account_id=$(aws sts get-caller-identity --query "Account" --output text)
```
3. 클러스터 OIDC 확인
```
$ aws eks describe-cluster --name eks-workshop --region $AWS_REGION --query "cluster.identity.oidc.issuer" --output text | sed -e "s/^https:\/\///"
$ oidc_provider=$(aws eks describe-cluster --name eks-workshop --region $AWS_REGION --query "cluster.identity.oidc.issuer" --output text | sed -e "s/^https:\/\///")
```
4. Namespace 생성
```
$ cat >ns.yaml <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: python
EOF
$ kubectl apply -f ns.yaml
```
---
# 2. 권한 관리

1. Policy 생성
```
$ cat >iam-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "sts:*",
                "eks:*"
            ],
            "Resource": "*"
        }
    ]
}
EOF
$ aws iam create-policy \
    --policy-name PythonTestRole-policy \
    --policy-document file://iam-policy.json
```
2. Role 생성
```
### Trust Relationhip
$ cat >trust-relationship.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::$account_id:oidc-provider/$oidc_provider"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "$oidc_provider:aud": "sts.amazonaws.com",
                    "$oidc_provider:sub": "system:serviceaccount:python:python-test-sa"
                }
            }
        }
    ]
}
EOF
### Create Role
$ aws iam create-role \
  --role-name PythonTestRole  \
  --assume-role-policy-document file://trust-relationship.json
### Attach Policy
$ aws iam attach-role-policy \
  --policy-arn arn:aws:iam::$account_id:policy/PythonTestRole-policy \
  --role-name PythonTestRole
```
3. Service Account 생성
```
$ cat >sa.yaml <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: python-test-sa
  namespace: python
  labels:
    app.kubernetes.io/name: python-test
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::$account_id:role/PythonTestRole
automountServiceAccountToken: true
EOF
$ kubectl apply -f sa.yaml
```
---
# 3. 테스트 이미지 생성
1. ECR Repository 생성하기
```
$ aws ecr create-repository --repository-name python
```
2. 배포 이미지 생성
```
$ cat >main.py <<EOF
from flask import Flask, request, jsonify
import boto3

app = Flask(__name__)


@app.route('/sts', methods=['GET'])
def sts():
    stsClient = boto3.client('sts')
    response = stsClient.get_caller_identity()
    print(response)
    return jsonify(response)


@app.route('/eks', methods=['GET'])
def eksClsuter():
    eksClient = boto3.client('eks')

    response = eksClient.list_clusters()
    print(response)
    return jsonify(response)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=6000, debug=True)
EOF
### requirements.txt
$ cat >requirements.txt <<EOF
blinker==1.6.2
boto3==1.28.3
botocore==1.31.3
click==8.1.5
Flask==2.3.2
importlib-metadata==6.8.0
itsdangerous==2.1.2
Jinja2==3.1.2
jmespath==1.0.1
MarkupSafe==2.1.3
python-dateutil==2.8.2
s3transfer==0.6.1
six==1.16.0
urllib3==1.26.16
Werkzeug==2.3.6
zipp==3.16.2
EOF

### Dockerfile
$ cat >Dockerfile <<EOF
FROM --platform=linux/amd64 python:3.12.0b4-alpine3.18

ENV AWS_DEFAULT_REGION=$AWS_REGION
ENV AWS_REGION=$AWS_REGION

COPY . /app/server

WORKDIR /app/server

RUN pip3 install -r requirements.txt

RUN apk update && apk add --no-cache ca-certificates bash git openssh curl gettext bind-tools aws-cli vim net-tools

EXPOSE 80
CMD ["python3", "main.py"]
EOF

### cicd.sh
$ cat >cicd.sh <<EOF
docker buildx build --platform linux/amd64 -t $account_id.dkr.ecr.$AWS_REGION.amazonaws.com/python:latest .

aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $account_id.dkr.ecr.$AWS_REGION.amazonaws.com

docker push $account_id.dkr.ecr.$AWS_REGION.amazonaws.com/python:latest

kubectl rollout restart deploy python-test-default -n python
kubectl rollout restart deploy python-test-irsa -n python
EOF
이미지 생성
$ chmod +x cicd.sh
$ ./cicd.sh
# 확인하기
$ docker image ls
# 확인하기
$ aws ecr list-images --repository-name python
---
Pod 생성하기
1. 기본 권한 Pod
$ cat >deployment-default.yaml <<EOF
apiVersion: apps/v1 
kind: Deployment
metadata:
  name: python-test-default
  namespace: python
spec:
  selector:
    matchLabels:
      app: python-test
  replicas: 1 
  template:
    metadata:
      labels:
        app: python-test
    spec:
      containers:
      - name: python-test
        image: $account_id.dkr.ecr.$AWS_REGION.amazonaws.com/python:latest
        ports:
        - containerPort: 6000
EOF
$ kubectl apply -f deployment-default.yaml
2. IRSA 사용 Pod
$ cat >deployment-irsa.yaml <<EOF
apiVersion: apps/v1 
kind: Deployment
metadata:
  name: python-test-irsa
  namespace: python
spec:
  selector:
    matchLabels:
      app: python-test
  replicas: 1 
  template:
    metadata:
      labels:
        app: python-test
    spec:
      serviceAccountName: python-test-sa
      containers:
      - name: python-test
        image: $account_id.dkr.ecr.$AWS_REGION.amazonaws.com/python:latest
        ports:
        - containerPort: 6000
EOF
$ kubectl apply -f deployment-irsa.yaml
```
3. Role 확인하기
```
$ kubectl get pods -A
NAMESPACE     NAME                     READY   STATUS    RESTARTS   AGE
python        python-test-irsa-xxx      1/1     Running   0          33s
python        python-test-default-xxx   1/1     Running   0          5s

$ kubectl debug python-test-irsa-xxx -n python -it --image=nicolaka/netshoot
$ kubectl debug python-test-default-xxx -n python -it --image=nicolaka/netshoot
python-test-irsa-xxx$ curl 127.0.0.1:6000/sts
{
  "Arn": "arn:aws:sts::<account-id>:assumed-role/PythonTestRole/botocore-session-xxx",
  ...
}
python-test-default-xxx$ curl 127.0.0.1:6000/sts
{
  "Arn": "arn:aws:sts::<account-id>:assumed-role/<NodeInstanceRole>/<node-instance>",
  ...
}
```


