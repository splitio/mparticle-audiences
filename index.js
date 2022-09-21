const axios = require('axios').default;

exports.handler = async (event) => {
    console.log(event);

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
            });

            console.log('created Split segment with srcName: ' + dstName + ' (' + srcId + ')');
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
            });    

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
                if(action === 'add') {
                    console.log('adding to segment: ' + segment_name);

                    const activateUrl = 'https://api.split.io/internal/api/v2/segments/' 
                        + account_settings.environmentId + '/' + segment_name;
 
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
                    });                

                    const url = 'https://api.split.io/internal/api/v2/segments/' 
                        + account_settings.environmentId + '/' + segment_name + '/uploadKeys?replace=false';
                    const d = {'keys': [mpid]};
                 
                    console.log('adding mpid to segment: ' + segment_name);
                    await axios({
                        method: 'put',
                        data: d,
                        url: url,
                        headers:{
                            'Authorization': 'Bearer ' + account_settings.apiKey
                        }
                    }).then(function (response) {
                        console.log(response);
                    }).catch(function (error) {
                        console.log(error);
                    });           

                    console.log('finish add mpid to segment: ' + segment_name);     
                } else if (action === 'delete') {
                    console.log('deleting from segment: ' + segment_name);

                    const url = 'https://api.split.io/internal/api/v2/segments/' 
                        + account_settings.environmentId + '/' + segment_name + '/removeKeys';

                    const d = {'keys': [mpid]};

                    console.log('removing mpid from segment: ' + segment_name);
                    await axios({
                        method: 'put',
                        data: d,
                        url: url,
                        headers:{
                            'Authorization': 'Bearer ' + account_settings.apiKey                       
                        }                    
                    }).then(function (response) {
                        console.log(response);
                    }).catch(function (error) {
                        console.log(error);
                    });  
                    console.log('finish remove mpid from segment: ' + segment_name);              
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
