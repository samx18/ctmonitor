# Serverless CloudTrail Parser 
A serverless solution to automatically parse cloudtrail logfiles and notify when a console sign-in occurs.

## Setup CloudTrail

Setup cloud trail to log events into a central S3 bucket

## Create & initialize a new project

	mkdir -p ctmonitor
	cd ctmonitor
	npm init

## Install npm packages

	npm install async


## Create a custom policy for your lambda function



	{
	  "Version": "2012-10-17",
	  "Statement": [
	    {
	      "Effect": "Allow",
	      "Action": [
	        "logs:*"
	      ],
	      "Resource": "arn:aws:logs:*:*:*"
	    },
	    {
	      "Effect": "Allow",
	      "Action": [
	        "s3:GetObject"
	      ],
	      "Resource": "arn:aws:s3:::examplebucket/*"
	    },
	    {
	      "Effect": "Allow",
	      "Action": [
	        "sns:Publish"
	      ],
	      "Resource": "your sns topic ARN"
	    }
	  ]
	}



## Create role

Create a role with the attached policy with the trusted entity as AWS Service - Lambda

## Create lambda function

Create a new lambda function and upload the zip of the deployment package. Choose the role you created above.

## Create a lambda permission to allow S3 to invoke your lambda function

	aws lambda add-permission \
	--function-name cloudtrail_parse \
	--region us-west-2 \
	--statement-id Id-1 \
	--action "lambda:InvokeFunction" \
	--principal s3.amazonaws.com \
	--source-arn arn:aws:s3:::examplebucket \
	--source-account 012345678912


## Validate permissions
You can validate the permissions using 

	aws lambda get-policy \
	--function-name cloudtrail_parse
	
## S3 event

Go to S3 properties and add notifications under the advanced Settings section. Choose event type as PUT and send to as lambda function. You can then choose the name of your lambda function.

## Environment variables 

	process.env.SNS_ARN;
