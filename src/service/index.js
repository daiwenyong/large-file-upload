import axios from "axios"

const url = 'http://localhost:3000'
const CancelToken = axios.CancelToken

export async function postFileService({ data, onDownloadProgress, requestObj, index }) {
    const res = await axios({
        url,
        data,
        method: 'post',
        onDownloadProgress,
        cancelToken: new CancelToken(function executor(c) {
            requestObj[index].cancel = c
            // requestList.find(r=>r.index===index).cancel = c
            // executor 函数接收一个 cancel 函数作为参数
        })
    })
    this.$delete(requestObj,index)
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
