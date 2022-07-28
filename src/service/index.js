import axios from "axios"

const url = 'http://localhost:3000'
const CancelToken = axios.CancelToken


export async function postFileService({ data, onDownloadProgress, request }) {
    const instance = axios.create({
        baseURL: url
    })
    // requestList.push(instance)
    const res = await instance.post(url,{ data,},{
        // method: 'post',

        onDownloadProgress,
        cancelToken: new CancelToken(function executor(c) {
            // executor 函数接收一个 cancel 函数作为参数
            request.cancel = c;
        })
    })
    // const xhrIndex = requestList.findIndex(item => item === instance)
    // requestList.splice(xhrIndex, 1)
    return res
}

export async function mergeService(data) {
    const res = await axios({
        url: url + '/merge',
        headers: {
            "content-type": "application/json"
        },
        data,
        method: 'post'
    })
    return res
}

export async function verifyService(data) {
    const res = await axios({
        url: url + '/verify',
        headers: {
            "content-type": "application/json"
        },
        data,
        method: 'post'
    })
    return res.data
}
