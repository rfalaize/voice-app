class AudioStoreApi {
    constructor() {
        if (process.env.NODE_ENV === "production") {
            this.url = "https://voice-recognition-server.herokuapp.com/";
        } else {
            this.url = "http://localhost:3300/";
        }
    }

    async saveRecord(userName, userEmailAddress, record, apiPwd) {
        const url = this.url + "voice-sample/save";
        const result = await fetch(url, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                NODE_API_SECRET_USER: apiPwd
            },
            mode: "cors",
            body: JSON.stringify({
                userName: userName,
                userEmailAddress: userEmailAddress,
                question: record.question,
                frequenciesData: record.frequenciesData,
                timeDomainData: record.timeDomainData
            })
        })
            .then(function(resp) {
                if (!resp.ok) {
                    // http request failed
                    throw new Error(resp.statusText);
                }
                return resp.json();
            })
            .catch(function(error) {
                const resp = {
                    status: false,
                    errorMessage: error.message
                };
                return resp;
            });
        return result;
    }

    async deleteRecord(recordId, apiPwd) {
        const url = this.url + "voice-sample/delete/" + recordId;
        const result = await fetch(url, {
            method: "DELETE",
            headers: {
                NODE_API_SECRET_USER: apiPwd
            },
            mode: "cors"
        })
            .then(function(resp) {
                if (!resp.ok) {
                    // http request failed
                    throw new Error(resp.statusText);
                }
                return resp.json();
            })
            .catch(function(error) {
                const resp = {
                    status: false,
                    errorMessage: error.message
                };
                return resp;
            });
        return result;
    }
}

export default AudioStoreApi;
