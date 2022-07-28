<template>
    <div>
        <input type="file" @change="handleFileChange" />
        <el-button @click="handleUpload">upload</el-button>
    </div>
</template>
<script>
import { SIZE, STATUS } from "./config"
import { postFileService, mergeService } from './service'

export default {
    name: 'App',
    data() {
        return {
            file: null,
            worker: null,
            hash: null,
            fileData: []
        }
    },
    methods: {
        handleFileChange(e) {
            const [file] = e.target.files
            if (!file) return
            this.file = file
            this.handleUpload()
        },
        // 生成文件 hash（web-worker）
        calculateHash(chunkList) {
            return new Promise(resolve => {
                this.worker = new Worker("/hash.js");
                this.worker.postMessage({ chunkList });
                this.worker.onmessage = e => {
                    const { percentage, hash } = e.data;
                    this.hashPercentage = percentage;
                    if (hash) {
                        resolve(hash);
                    }
                };
            })
        },
        createFileChunk() {
            const file = this.file
            const res = []
            let idx = 0
            while (idx < file.size) {
                res.push(file.slice(idx, idx = idx + SIZE))
            }
            return res
        },
        async handleUpload() {
            if (!this.file) return
            const chunkList = this.createFileChunk()
            this.hash = await this.calculateHash(chunkList)

            const requestList = chunkList.map(async (file, index) => {
                const formData = this.getFormData(file, index)
                return postFileService({
                    data: formData
                })
            })
            await Promise.all(requestList)
            await this.merge()
        },
        getFormData(file, index) {
            const formData = new FormData()
            formData.append("chunk", file);
            formData.append("hash", this.hash + "-" + index);
            formData.append("filename", this.file.name);
            formData.append("fileHash", this.hash)
            return formData
        },
        async merge() {
            await mergeService({
                size:SIZE,
                fileHash:this.hash,
                filename:this.file.name
            })
            this.$message.success('upload success')

        }
    }
}
</script>
