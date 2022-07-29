const proto = Object.prototype
const toString = proto.toString

export function isFunction(fn) {
    return toString.call(fn) === '[object Function]'
}


export function createFileChunk(file, size) {
    const res = []
    let idx = 0
    while (idx < file.size) {
        res.push(file.slice(idx, idx = idx + size))
    }
    return res
}
