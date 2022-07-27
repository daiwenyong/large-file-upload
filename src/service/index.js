import axios from "axios"

async function postFile({data, onProgress, requestList}) {
    const res = await axios({
        url: "http://localhost:3000",
        data,
        methods: 'POST',
        onProgress,
        requestList
    })
    console.log('axios',res)
    return res
}
