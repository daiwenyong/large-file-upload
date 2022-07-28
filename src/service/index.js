import axios from "axios"

const url = 'http://localhost:3000'

export async function postFileService({ data, onProgress, requestList }) {
    const res = await axios({
        url,
        data,
        method: 'post',
        onProgress,
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
