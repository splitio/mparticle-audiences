const axios = require('axios').default;
const https = require('https');
const fs = require('fs');

const rawdata = fs.readFileSync('config.json');
const configJson = JSON.parse(rawdata);

const audiencesBatchEndpoint = configJson.audiencesBatchEndpoint;
const audiencesBatchAuthKey = configJson.audiencesBatchAuthKey;

exports.handler = async (event) => {
    console.log(event);

    console.log('batch endoint: ' + audiencesBatchEndpoint);
    console.log('batch auth: ' + audiencesBatchAuthKey);

    if(!event.body) {
        const response = {
            statusCode: 400,
            body: 'invalid request: no event body'
        }
        return response;
    }

    const body = JSON.parse(event.body);
    console.log(JSON.stringify(body));

    if(body.type === "module_registration_request") {
        console.log("module_registration_request");

        const json = {
            type: "module_registration_response",
            id: "fa136f6f-fc70-4504-8979-26a4a375f95b",
            timestamp_ms: new Date().getTime(),
            sdk_version: "2.2.0",
            name: "Split",
            version: "1.0",
            description: "<a href=\"https://www.split.io/\" target=\"_blank\">Split</a> is the leading Feature Delivery Platform for engineering teams that want to confidently release features fast. Manage feature flags, monitor production releases, and experiment to create the best customer experience.",
            permissions:
            {
                "allow_access_mpid": true
            },
            audience_processing_registration:
            {
                account_settings:
                [
                    {
                        type: "text",
                        id: "apiKey",
                        name: "Admin API Key",
                        description: "Admin API Key for creating, updating, and deleting segments.",
                        visible: true,
                        required: true,
                        confidential: true
                    },
                    {
                        type: "text",
                        id: "workspaceId",
                        name: "Workspace Id",
                        description: "Which workspace should have new segments?",
                        visible: true,
                        required: true,
                        confidential: true
                    },
                    {
                        type: "text",
                        id: "environmentId",
                        name: "Environment Id",
                        description: "Which environment should include audience keys?",
                        visible: true,
                        required: true,
                        confidential: true
                    },
                    {
                        type: "text",
                        id: "trafficTypeId",
                        name: "Traffic Type Id",
                        description: "Should correspond to an 'mpid' traffic type.  Create one if necessary.",
                        visible: true,
                        required: true,
                        confidential: true,
                    }                                    
                ],
            },
            firehose_version: "2.2.0"
        }

        const response = {
            statusCode: 200,
            body: json
        }

        return response;
    }

    const account = body.account;
    if(!account) {
        const response = {
            statusCode: 400,
            body: 'invalid request: no account'
        }
        return response;
    }

    const account_settings = account.account_settings;
    if(!account_settings.apiKey) {
        const response = {
            statusCode: 400,
            body: 'admin api key not found in account_settings'
        }
        return response;
    }
    if(!account_settings.environmentId) {
        const response = {
            statusCode: 400,
            body: 'environmentId not found in account_settings'
        }
        return response;
    }
    if(!account_settings.workspaceId) {
        const response = {
            statusCode: 400,
            body: 'workspaceId not found in account_settings'
        }
        return response;
    }
    if(!account_settings.trafficTypeId) {
        const response = {
            statusCode: 400,
            body: 'trafficTypeId not found in account_settings'
        }
        return response;
    }

    let result = {
        "id" : "c2555fb5-53b4-407e-b1ec-7dbbbae182e6",
        "timestamp_ms" : new Date().getTime(),
        "firehose_version" : "2.8.0",
    }
    if(body.type === "audience_subscription_request") {
        result.type = "audience_subscription_response";
        const srcName = body.audience_name;
        const srcId = body.audience_id;

        const dstName = convertForSplit(srcName);

        let statusCode = 200;
        let message = '';
        if(body.action === "add") {
            const url = 'https://api.split.io/internal/api/v2/segments/ws/' 
                + account_settings.workspaceId + '/trafficTypes/' + account_settings.trafficTypeId;
            const d = {
                name: dstName,
                description: 'created by Split-mParticle integration for audience_name: ' + srcName + ' with audience_id: ' + srcId 
            }

            console.log('creating segment with admin api...');
            await axios({
                method: 'post',
                data: d,
                url: url,
                headers:{
                    'Authorization': 'Bearer ' + account_settings.apiKey
                }
            }).then(function (response) {
                console.log(response);
            }).catch(function (error) {
                console.log(error);                       
                statusCode = error.response.status,
                message = error.response.data.message
            });           

            if(statusCode !== 200) {
                const response = {
                    statusCode: statusCode,
                    body: message
                }
                console.log('returning error response: ' + JSON.stringify(response));
                return response;
            }
                    
            const activateUrl = 'https://api.split.io/internal/api/v2/segments/' 
                + account_settings.environmentId + '/' + dstName;

            console.log('activating segment in environment ');
            console.log(activateUrl);
            await axios({
                method: 'post',
                data: {},
                url: activateUrl,
                headers:{
                    'Authorization': 'Bearer ' + account_settings.apiKey
                }
            }).then(function (response) {
                console.log(response);
            }).catch(function (error) {
                console.log(error);                       
                statusCode = error.response.status,
                message = error.response.data.message
            });           

            if(statusCode !== 200) {
                const response = {
                    statusCode: statusCode,
                    body: message
                }
                console.log('returning error response: ' + JSON.stringify(response));
                return response;
            }
            console.log('created Split segment ' + dstName + ' with srcName: ' + srcName + ' (' + srcId + ')');
            console.log('statusCode: ' + 200);
            console.log(JSON.stringify(result));
            const response = {
                statusCode: 200,
                body: JSON.stringify(result)
            }
            return response;
        } else if (body.action === "remove") {
            console.log('audience_subscription_request remove');

            const url = 'https://api.split.io/internal/api/v2/segments/ws/' 
                + account_settings.workspaceId + '/' + dstName;

            console.log('removing segment in all environments: ' + dstName);
            await axios({
                method: 'delete',
                url: url,
                headers:{
                    'Authorization': 'Bearer ' + account_settings.apiKey
                }
            }).then(function(response) {
                console.log(response);
            }).catch(function (error) {
                console.log(error);                       
                statusCode = error.response.status,
                message = error.response.data.message
            });           

            if(statusCode !== 200) {
                const response = {
                    statusCode: statusCode,
                    body: message
                }
                console.log('returning error response: ' + JSON.stringify(response));
                return response;
            }
            console.log('deleted segment with name: ' + dstName);
            console.log('statusCode: ' + 200);
            console.log(JSON.stringify(result));
            const response = {
                statusCode: 200,
                body: JSON.stringify(result)
            }
            return response;
        }
    } else if (body.type === "audience_membership_change_request") {
        result.type = "audience_membership_change_response";
        if(!body.user_profiles) {
            console.log('no user_profiles found in request');
            console.log('statusCode: ' + 200);
            console.log(JSON.stringify(result));
            const response = {
                statusCode: 200,
                body: JSON.stringify(result)
            }
            return response;
        }
        const user_profiles = body.user_profiles;

        for(const user_profile of user_profiles) {
            const mpid = user_profile.mpid;
            const audiences = user_profile.audiences;
            console.log(audiences);
            for(const audience of audiences) {
                console.log(audience);
                const action = audience.action;
                const segment_name = convertForSplit(audience.audience_name);
                let statusCode = 200;
                let message = '';
                if(action === 'add' || action == 'delete') {
                    console.log('adding to segment: ' + segment_name);          

                    const url = audiencesBatchEndpoint;

                    const d = {
                        apiToken: account_settings.apiKey,
                        workspaceId: account_settings.workspaceId,
                        environmentId: account_settings.environmentId,
                        trafficTypeId: account_settings.trafficTypeId,
                        verb : action,
                        "mpids" : [mpid],
                        "segment": segment_name
                    }
                 
                    const agent = new https.Agent({
                        rejectUnauthorized: false
                    });

                    console.log('passing MPID to batch server: ' + segment_name);
                    await axios({
                        method: 'post',
                        data: d,
                        url: url,
                        headers:{
                            'Authorization': audiencesBatchAuthKey
                        },
                        httpsAgent: new https.Agent({
                            rejectUnauthorized: false
                        })                        
                    }).then(function (response) {
                        console.log(response);
                    }).catch(function (error) {
                        console.log(error);
                        if(error.response) {
                            statusCode = error.response.status;
                            message = error.response.data.message;
                        } else {
                            statusCode = 500;
                            message = error;
                        }
                    });           

                    if(statusCode !== 200) {
                        const response = {
                            statusCode: statusCode,
                            body: message
                        }
                        console.log('returning error response: ' + JSON.stringify(response));
                        return response;
                    }

                    console.log('finish add/delete mpid to batch server: ' + segment_name);     
                } else {
                    console.log('skipped unknown verb (expected add or delete): ' + action);
                }
            }
        }

    } else {
        const response = {
            statusCode: 400,
            body: 'unknown request type: ' + body.type
        }
        return response;
    }
    console.log('statusCode: ' + 200);
    console.log(JSON.stringify(result));
    const response = {
        statusCode: 200,
        body: JSON.stringify(result)
    }
    return response;
};

function convertForSplit(srcName) {
    let dstName = "s";

    const allowed = ['-','_','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','0','1','2','3','4','5','6','7','8','9'];

    for (let i = 0; i < srcName.length; i++) {
        if(allowed.includes(srcName.charAt(i))) {
            dstName += srcName.charAt(i);
        } else {
            dstName += '_';
        }
    }

    return dstName;
}
