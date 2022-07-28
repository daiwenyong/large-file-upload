<template>
    <div>
        <div>

            <input type="file" @change="handleFileChange"/>
            <el-button @click="handleUpload">upload</el-button>

            <el-button
                v-if="status === STATUS.uploading || !file"
                @click="handlePause"
            >
                暂停
            </el-button>

            <el-button
                v-else
                @click="handleResume">
                恢复
            </el-button>
        </div>
        <div>
            <div>计算文件 hash</div>
            <el-progress :percentage="hashProgress"></el-progress>
        </div>

        <el-table :data="fileData">
            <el-table-column
                prop="hash"
                label="切片hash"
                align="left"
            ></el-table-column>
            <el-table-column label="大小(KB)" align="left" width="120">
                <template v-slot="{ row }">
                    {{ row.size | transformByte }}
                </template>
            </el-table-column>
            <el-table-column label="进度" align="center">
                <template v-slot="{ row }">
                    <el-progress
                        :percentage="row.progress"
                        color="#909399"
                    ></el-progress>
                </template>
            </el-table-column>
        </el-table>
    </div>
</template>
<script>
import {SIZE, STATUS} from "./config"
import {postFileService, verifyService, mergeService} from './service'

export default {
    name: 'App',
    data() {
        return {
            STATUS,
            file: null,
            worker: null,
            hash: null,

            requestList: [],
            fileData: [],
            hashProgress: 0,
            status: STATUS.wait
        }
    },
    filters: {
        transformByte(val) {
            return Number((val / 1024).toFixed(0));
        }
    },
    methods: {
        handlePause() {
            if (this.status === STATUS.pause) return
            this.status = STATUS.pause
            console.log(this.requestList, this.requestList.length)
            this.requestList.forEach(i => i.cancel())
        },
        async handleResume() {
            this.status = STATUS.uploading
            const {uploadedList} = await this.verify()
            this.upload(uploadedList)
        },
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
                this.worker.postMessage({chunkList});
                this.worker.onmessage = e => {
                    const {percentage, hash} = e.data;
                    this.hashProgress = percentage;
                    if (hash) {
                        resolve(hash);
                    }
                };
            })
        },
        createFileChunk(file, size = SIZE) {
            const res = []
            let idx = 0
            while (idx < file.size) {
                res.push(file.slice(idx, idx = idx + SIZE))
            }
            return res
        },
        async handleUpload() {
            if (!this.file) return
            this.status = STATUS.uploading
            const chunkList = this.createFileChunk(this.file)
            this.hash = await this.calculateHash(chunkList)

            const {shouldUpload, uploadedList} = await this.verify()

            if (!shouldUpload) {
                this.$message.success('second upload')
                return
            }
            // 数据展示
            this.fileData = chunkList.map((chunk, index) => {
                const hash = this.hash + "-" + index
                return {
                    fileHash: this.hash,
                    hash,
                    index,
                    chunk,
                    size: chunk.size,
                    progress: uploadedList.includes(hash) ? 100 : 0
                }
            })
            this.upload(uploadedList)
        },
        async upload(uploadedList) {
            let filterUploadList = this.fileData
            // 过滤之前已经上传
            if(uploadedList.length){
                filterUploadList = this.fileData.filter(({hash})=>!uploadedList.includes(hash))
            }
            // 请求相关
            this.requestList = filterUploadList.map((chunk, index) => ({
                index,
                cancel: null
            }))
            const requestPromises = filterUploadList.map((chunk, index) => {
                const formData = this.getFormData(chunk, index)
                return postFileService({
                    data: formData,
                    onDownloadProgress: this.createChunkProgress(this.fileData[index]),
                    requestList: this.requestList,
                    index: index
                })
            })
            await Promise.all(requestPromises)
            if(uploadedList.length + filterUploadList.length === this.fileData.length){
                await this.merge()
            }
        },
        getFormData(chunk, index) {
            const formData = new FormData()
            formData.append("chunk", chunk);
            formData.append("hash", this.hash + "-" + index);
            formData.append("filename", this.file.name);
            formData.append("fileHash", this.hash)
            return formData
        },
        createChunkProgress(chunk) {
            return e => {
                const p = parseInt(String((e.loaded / e.total) * 100))
                this.$set(chunk, 'progress', p)
            }
        },

        async verify() {
            const res = await verifyService({
                filename: this.file.name,
                fileHash: this.hash
            })
            return res
        },
        async merge() {
            await mergeService({
                size: SIZE,
                fileHash: this.hash,
                filename: this.file.name
            })
            this.$message.success('upload success')
        }
    }
}
</script>
