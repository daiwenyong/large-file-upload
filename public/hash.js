self.importScripts("/spark-md5.min.js") // 导入脚本
// 生成文件 hash
self.onmessage = e => {
    const { chunkList } = e.data
    console.log(chunkList)
    const spark = new self.SparkMD5.ArrayBuffer()
    let percentage = 0
    let count = 0
    const loadNext = index => {
        const reader = new FileReader()
        reader.readAsArrayBuffer(chunkList[index]) // 读取指定的 Blob 或 File 内容
        reader.onload = e => {
            count++
            spark.append(e.target.result)
            if (count === chunkList.length) {
                self.postMessage({
                    percentage: 100,
                    hash: spark.end()
                })
                self.close()
            } else {
                percentage += 100 / chunkList.length
                self.postMessage({
                    percentage
                })
                loadNext(count)
            }
        }
    }
    loadNext(0)
}
