import axios from "axios"

const url = 'http://localhost:3000'

export async function postFileService({ data, onDownloadProgress, requestList }) {
    const res = await axios({
        url,
        data,
        method: 'post',
        onDownloadProgress,
        requestList
    })
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
