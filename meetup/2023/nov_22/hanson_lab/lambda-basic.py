Lambda code example
import json
import boto3
from datetime import datetime
from dateutil.relativedelta import *

def lambda_handler(event, context):
    client = boto3.client('ce')
    
    today = datetime.today()
    this_month_first_day = datetime(today.year, today.month, 1)
    
    str_today = str(today.strftime('%Y-%m-%d'))
    str_first_day = this_month_first_day.strftime('%Y-%m-%d')
    
    #Cost Expolorer
    result = client.get_cost_and_usage(
        Granularity= 'MONTHLY',
        TimePeriod={
        'Start': str_first_day,
        'End': str_today
        },
        Metrics=[ 'UnblendedCost',] 
    )
    
    #Send Message with Amazon SNS
    sns = boto3.client('sns', region_name='ap-northeast-1')
    cost = float(result['ResultsByTime'][0]['Total']['UnblendedCost']['Amount'])
    cost_round = round(cost, 2)
    str_cost = str(cost_round)
    
    message_content  = "금일 %s 일 기준 이번 달 사용 금액은 %s 달러입니다."%(str_today, str_cost)
    
    #Change phone number 
    sns.publish(PhoneNumber="+821012345678", Message=message_content ) 
    
    return {
        'statusCode': 200,
        'body': json.dumps('Message was sent successfully!')
    }
