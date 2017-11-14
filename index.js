var aws  = require('aws-sdk');
var zlib = require('zlib');
var async = require('async');
const url = require('url');
const http = require('http');
const https = require('https');
var EVENT_SOURCE_TO_TRACK = /signin.amazonaws.com/;  
var EVENT_NAME_TO_TRACK   = /ConsoleLogin/; 
var DEFAULT_SNS_REGION  = 'us-west-2';
var SNS_TOPIC_ARN       = process.env.SNS_ARN;
const slackChannel = '#bot-testing';
const hookUrl = process.env.SLACK_WEBHOOK;

var s3 = new aws.S3();
var sns = new aws.SNS({
    apiVersion: '2010-03-31',
    region: DEFAULT_SNS_REGION
});

exports.handler = function(event, context, callback) {
    var srcBucket = event.Records[0].s3.bucket.name;
    var srcKey = event.Records[0].s3.object.key;
   
    async.waterfall([
        function fetchLogFromS3(next){
            console.log('Fetching compressed log from S3...');
            s3.getObject({
               Bucket: srcBucket,
               Key: srcKey
            },
            next);
        },
        function uncompressLog(response, next){
            console.log("Uncompressing log...");
            zlib.gunzip(response.Body, next);
        },
        function publishNotifications(jsonBuffer, next) {
            console.log('Filtering log...');
            var json = jsonBuffer.toString();
            console.log('CloudTrail JSON from S3:', json);
            var records;
            try {
                records = JSON.parse(json);
            } catch (err) {
                next('Unable to parse CloudTrail JSON: ' + err);
                return;
            }
            var matchingRecords = records
                .Records
                .filter(function(record) {
                    return record.eventSource.match(EVENT_SOURCE_TO_TRACK)
                        && record.eventName.match(EVENT_NAME_TO_TRACK);
                });
                
            console.log('Publishing ' + matchingRecords.length + ' notification(s) in parallel...');
            async.each(
                matchingRecords,
                function(record, publishComplete) {
                    console.log('Publishing notification: ', record);
                    sns.publish({
                        Message:
                            'Alert... Console Sign in detected! \n'+'User Name: ' + record.userIdentity.userName + '\n' + 'Region: '+ record.awsRegion + '\n'+ 'Source IP: '+ record.sourceIPAddress+'\n',
                        TopicArn: SNS_TOPIC_ARN
                    }, publishComplete);
                    var data = ':rotating_light: Console Sign in detected! \n'+'User Name: ' + '`'+record.userIdentity.userName + '`'+'\n' + 'Region: '+ '`'+record.awsRegion +'`'+ '\n'+ 'Source IP: '+ '`'+record.sourceIPAddress+'`'+'\n'

                    const slackMessage = {
                    channel: slackChannel,
                    text: data
                    };
                    const body = JSON.stringify(slackMessage);
                    const options = url.parse(hookUrl);
                    options.method = 'POST';
                    options.headers = {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(body),
                    };
            
                    
                    var post_req = https.request(options, function(res) {
                    // debug response from webhook
                    // res.setEncoding('utf8');
                    // res.on('data', function (chunk) {
                    //     console.log('Response: ' + chunk);
                    // });
                    });

                    // post the data
                    post_req.write(JSON.stringify( slackMessage ));
                    post_req.end();
                },
                next
            );
        }
    ], function (err) {
        if (err) {
            console.error('Failed to publish notifications: ', err);
        } else {
            console.log('Successfully published all notifications.');
        }
        callback(null,"message");
    });
};

