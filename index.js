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

    const account = body.account;
    if(!account || account.account_id !== "split") {
        const response = {
            statusCode: 400,
            body: 'unsupported account id; must be split'
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

    if(body.type === "audience_subscription_request") {
        if(body.action === "add") {
            const srcName = body.audience_name;
            const srcId = body.audience_id;

            const dstName = convertForSplit(srcName);

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

            const response = {
                statusCode: 200,
                body: 'created Split segment with srcName: ' + dstName + ' (' + srcId + ')'
            }
            return response;
        }
    } else if (body.type === "audience_membership_change_request") {

        if(!body.user_profiles) {
            const response = {
                statusCode: 400,
                body: 'no user_profiles found in request'
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

                    const activateUrl = 'https://api.split.io/internal/api/v2/segments/' + account_settings.environmentId + '/' + segment_name;
 
                    console.log('activating segment in environment ' + account_settings.environmentId);
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

    const response = {
        statusCode: 200,
        body: JSON.stringify('Hello from Split!'),
    };
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
