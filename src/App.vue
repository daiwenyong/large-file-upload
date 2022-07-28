<template>
    <div>
        <input type="file" @change="handleFileChange" />
        <el-button @click="handleUpload">upload</el-button>

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
import { SIZE, STATUS } from "./config"
import { postFileService, verifyService, mergeService } from './service'

export default {
    name: 'App',
    data() {
        return {
            file: null,
            worker: null,
            hash: null,

            fileData: [],
            hashProgress: 0
        }
    },
    filters: {
        transformByte(val) {
            return Number((val / 1024).toFixed(0));
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
                    this.hashProgress = percentage;
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

            const { shouldUpload, uploadedList } = await this.verify(this.file.name, this.hash)
            if (!shouldUpload) {
                this.$message.success('second upload')
                return
            }

            // 数据展示
            this.fileData = chunkList.map((chunk, index) => {
                return {
                    fileHash: this.hash,
                    hash: this.hash + "-" + index,
                    index,
                    chunk,
                    size: chunk.size,
                    progress: 0
                }
            })
            // 请求相关
            const requestList = chunkList.map((chunk, index) => {
                const formData = this.getFormData(chunk, index)
                return postFileService({
                    data: formData,
                    onDownloadProgress: this.createChunkProgress(this.fileData[index])
                })
            })
            await Promise.all(requestList)
            await this.merge()
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

        async verify(filename, fileHash) {
            const res = await verifyService({
                filename,
                fileHash
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
