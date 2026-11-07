import{a as e,i as t,t as n}from"./hooks.module.DYOjMz2f.js";import{n as r}from"./editor.Bx2LGAbI.js";import{t as i}from"./jsxRuntime.module.dOYewpzQ.js";function a(e,t){return`
    <!doctype html>
    <html>
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width" />
            <meta name="robots" content="noindex, nofollow" />
            <meta name="hash" content=${t} />
            <style>
                html {
                    overflow: hidden;
                    background-color: black;
                }
                canvas {
                    margin: auto;
                }
            </style>
        </head>
        <body>
            <script type="module">${e}<\/script>
        </body>
    </html>`}var o=()=>{let o=n(null),s=r(),c=s.example?s.code[s.example]:``,[l,u]=t(a(c,0));return e(()=>{let e=setTimeout(()=>{u(a(c,s.lastUpdate??0))},500);return()=>{clearTimeout(e)}},[c,s.lastUpdate]),i(`div`,{class:`flex flex-3 flex-col border-l border-white`,children:[i(`div`,{id:`iframe-container`,class:`flex-2 bg-black`,children:c&&i(`iframe`,{ref:o,class:`h-full w-full`,srcDoc:l})}),i(`div`,{class:`flex-1`})]})};export{o as default};