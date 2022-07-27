<template>
    <div>
        <input type="file" @change="handleFileChange"/>
        <el-button @click="handleUpload">upload</el-button>
    </div>
</template>
<script>
import {SIZE, STATUS} from "./config"
import {postFile} from './service'

export default {
    name: 'App',
    data() {
        return {
            container: {
                file: null
            },
            fileData: []
        }
    },
    methods: {
        handleFileChange(e) {
            const [file] = e.target.files
            if (!file) return
            this.container.file = file
            this.handleUpload()
        },
        // 生成文件 hash（web-worker）
        calculateHash(chunkList) {
            return new Promise(resolve => {
                this.container.worker = new Worker("/hash.js");
                this.container.worker.postMessage({ chunkList });
                this.container.worker.onmessage = e => {
                    const { percentage, hash } = e.data;
                    this.hashPercentage = percentage;
                    if (hash) {
                        resolve(hash);
                    }
                };
            })
        },
        createFileChunk() {
            const file = this.container.file
            const res = []
            let idx = 0
            while (idx < file.size) {
                res.push(file.slice(idx, idx = idx + SIZE))
            }
            return res
        },
        async handleUpload() {
            if (!this.container.file) return
            const chunkList = this.createFileChunk()
            this.container.hash = await this.calculateHash(chunkList)

            this.data = chunkList.map(async (file,index)=>{
                const formData = this.getFormData(file,index)
                const res = await postFile({
                    data:formData
                })
                console.log(res)
            })
        },
        getFormData(file,index){
            const formData = new FormData()
            formData.append("chunk", file);
            formData.append("hash", this.container.hash + "-" + index);
            formData.append("filename", this.container.file.name);
            formData.append("fileHash", this.container.hash)
            return formData
        }
    }
}
</script>