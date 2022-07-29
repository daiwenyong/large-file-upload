<template>
    <div>
        <div>
            <input type="file" @change="handleFileChange" />
            <el-button @click="handleUpload">upload/上传</el-button>

            <template v-if="status !== STATUS.wait">
                <el-button
                    v-if="status === STATUS.uploading || !this.hash"
                    :disabled="status !== STATUS.uploading"
                    @click="handlePause">
                    pause/暂停
                </el-button>

                <el-button
                    v-else
                    @click="handleResume">
                    resume/恢复
                </el-button>
            </template>
        </div>

        <div>
            <div>计算文件 hash</div>
            <el-progress :percentage="hashProgress"></el-progress>
        </div>
        <div>
            <div>总进度</div>
            <el-progress :percentage="totalProgress"></el-progress>
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
import { SIZE, STATUS } from "./config"
import { isFunction, createFileChunk } from "./utils"
import { postFileService, verifyService, mergeService } from './service'

export default {
    name: 'App',
    data() {
        return {
            STATUS,
            file: null,
            worker: null,
            hash: null,

            requestObj: {},
            fileData: [],
            status: STATUS.wait,
            hashProgress: 0,
            totalProgress:0
        }
    },
    filters: {
        transformByte(val) {
            return Number((val / 1024).toFixed(0))
        }
    },
    computed: {
        a() {
        }
    },
    watch:{
        fileData:{
            handler(v){
                const { file } = this
                if (!file || !v.length) return 0
                const sum = v.reduce((pre, next) => pre + next.progress * next.size, 0)
                this.totalProgress = +(sum / file.size).toFixed(2)
            },
            deep:true
        }
    },
    methods: {
        handlePause() {
            this.status = STATUS.pause
            Object.values(this.requestObj).forEach(i => {
                isFunction(i.cancel) && i.cancel()
            })
            this.requestObj = {}
            this.worker && (this.worker.onmessage = null)
        },
        async handleResume() {
            this.status = STATUS.uploading
            const { shouldUpload, uploadedList } = await this.verify()
            if (!shouldUpload) return
            this.upload(uploadedList)
        },
        handleFileChange(e) {
            const [file] = e.target.files
            if (!file) return
            this.file = file
        },
        // 生成文件 hash（web-worker）
        calculateHash(chunkList) {
            return new Promise(resolve => {
                this.worker = new Worker("/hash.js")
                this.worker.postMessage({ chunkList })
                this.worker.onmessage = e => {
                    const { percentage, hash } = e.data
                    this.hashProgress = +percentage.toFixed(2)
                    if (hash) {
                        resolve(hash)
                    }
                }
            })
        },
        async handleUpload() {
            if (!this.file) return
            this.status = STATUS.uploading
            this.hashProgress = 0
            this.totalProgress = 0
            this.fileData = []

            const chunkList = createFileChunk(this.file, SIZE)
            this.hash = await this.calculateHash(chunkList)

            const { shouldUpload, uploadedList } = await this.verify()
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
            // index 坑
            let filterUploadList = this.fileData
            // 过滤之前已经上传
            if (uploadedList.length) {
                filterUploadList = this.fileData.filter(({ hash }) => !uploadedList.includes(hash))
            }

            const requestPromises = []
            filterUploadList.forEach(({ chunk, index }) => {
                this.$set(this.requestObj, `${index}`, { cancel: null })  // 请求相关
                requestPromises.push(this.getRequest(chunk, index))
            })
            await Promise.all(requestPromises)
            await this.merge()
        },
        getRequest(chunk, index) {
            const formData = this.getFormData(chunk, index)
            return postFileService.call(this, {
                index,
                data: formData,
                onDownloadProgress: this.createChunkProgress(this.fileData[index]),
                requestObj: this.requestObj
            })
        },
        getFormData(chunk, index) {
            const formData = new FormData()
            formData.append("chunk", chunk)
            formData.append("hash", this.hash + "-" + index)
            formData.append("filename", this.file.name)
            formData.append("fileHash", this.hash)
            return formData
        },
        createChunkProgress(chunk) {
            return e => {
                const p = +((e.loaded / e.total) * 100).toFixed(2)
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
            this.status = STATUS.wait
        }
    }
}
</script>
