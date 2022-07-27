<template>
    <div>
        <input
            type="file"
            @change="handleFileChange" />
        <el-button
            @click="handleUpload"
            :disabled="uploadDisabled">
            上传
        </el-button>
        hash: <el-progress :percentage="hashPercentage"></el-progress>

        <div>总进度</div>
        <el-progress :percentage="fakeUploadPercentage"></el-progress>
    </div>
</template>

<script>
const SIZE = 1024 * 1024
export default {
    name: "Demo",
    components: {},
    data() {
        return {
            container: {
                hash: null,
                file: null,
                worker: null
            },
            hashPercentage:0,
            fakeUploadPercentage:0
        }
    },
    computed: {
        uploadDisabled() {
            return !this.container.file
        }
    },
    methods: {
        handleFileChange(e) {
            const [files] = e.target.files
            this.container.file = files
        },
        async handleUpload() {
            if (!this.container.file) return
            const fileChunkList = this.createFileChunk()
            this.container.hash = await this.calculateHash(fileChunkList)
        },
        createFileChunk() {
            const file = this.container.file
            const res = []
            let idx = 0
            while (idx < file.size) {
                res.push({file:file.slice(idx, idx + SIZE)})
                idx += SIZE
            }
            return res
        },
        calculateHash(fileChunkList){
            return new Promise((resolve, reject) => {
                this.container.worker = new Worker('/hash.js')
                this.container.worker.postMessage({ fileChunkList })
                this.container.worker.onmessage = e=>{
                    const { percentage, hash } = e.data;
                    this.hashPercentage = percentage
                    hash && resolve(hash)
                }
            })
        },
        request({
                    url,
                    method = "post",
                    data,
                    headers = {},
                    onProgress = e => e,
                    requestList
                }) {

            return new Promise(resolve => {
                const xhr = new XMLHttpRequest();
                xhr.upload.onprogress = onProgress;
                xhr.open(method, url);
                Object.keys(headers).forEach(key =>
                    xhr.setRequestHeader(key, headers[key])
                );
                xhr.send(data);
                xhr.onload = e => {
                    // 将请求成功的 xhr 从列表中删除
                    if (requestList) {
                        console.log("-> ", requestList);
                        const xhrIndex = requestList.findIndex(item => item === xhr);
                        requestList.splice(xhrIndex, 1);
                    }
                    resolve({
                        data: e.target.response
                    });
                };
                // 暴露当前 xhr 给外部
                requestList?.push(xhr);
                console.log("-> ", requestList);
            });
        },
    }
}
</script>

<style lang='scss'>

</style>