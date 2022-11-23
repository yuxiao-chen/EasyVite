const Koa = require('koa')
const fs = require('fs')
const path = require('path')
const compilerSFC = require('@vue/compiler-sfc')
const compilerDOM = require('@vue/compiler-dom')

const app = new Koa()
const rootResolve = (...arg) => path.join(__dirname, '../', ...arg)

function rewriteImport(content) {
    return content.replace(/ from ['"](.*)['"]/g, (s1, s2) => {
        if (s2.startsWith('./') || s2.startsWith('../') || s2.startsWith('/')) {
            return s1
        } else {
            return ` from "/@modules/${s2}"`
        }
    })
}

app.use(async (ctx) => {
    const { url, query } = ctx.request
    // 入口 html
    if (url === '/') {
        ctx.type = 'text/html'
        ctx.body = fs.readFileSync(rootResolve('public/index.html'), 'utf-8')
        // 常规 js
    } else if (url.endsWith('.js')) {
        ctx.type = 'application/javascript'
        ctx.body = rewriteImport(fs.readFileSync(rootResolve(url), 'utf-8'))
        // npm包
    } else if (url.startsWith('/@modules/')) {
        const modulesName = url.replace('/@modules/', '')
        const prefix = rootResolve('node_modules', modulesName)
        const modulePath = require(prefix + '/package.json').module
        const ret = fs.readFileSync(path.join(prefix, modulePath), 'utf-8')

        ctx.type = 'application/javascript'
        ctx.body = rewriteImport(ret)
        // vue sfc
    } else if (url.indexOf('.vue') > -1) {
        console.log('end with vue', url)
        const filePath = rootResolve(url.split('?')[0])
        const content = fs.readFileSync(filePath, 'utf-8')
        const sfcAst = compilerSFC.parse(content)

        // script 部分， 解析返回
        if (!query.type) {
            const script = sfcAst.descriptor.script.content.replace('export default', 'const __script =')
            ctx.type = 'application/javascript'
            // aop, 分离渲染和逻辑相关代码的请求
            ctx.body = `
                import { render as __render } from '${url}?type=template'
                ${rewriteImport(script)}
                __script.render = __render
                export default __script
            `
            // template 部分
        } else if (query.type === 'template') {
            const render = compilerDOM.compile(sfcAst.descriptor.template.content, { mode: 'module' })
            console.log(render)
            ctx.type = 'application/javascript'
            // aop, 分离渲染和逻辑相关代码的请求
            ctx.body = `
            ${rewriteImport(render.code)}
            `
        }
    }
})

app.listen(3000, () => {
    console.log('server start, listen 3000')
})