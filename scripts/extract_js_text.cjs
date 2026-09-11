/* Development-only AST inventory. npm install --prefix /tmp/conan-i18n acorn acorn-walk */
const fs=require('fs'),path=require('path'),acorn=require('acorn'),walk=require('acorn-walk');
const root=path.resolve(__dirname,'..'),result=[];
for(const name of ['app.js','graph.js','graph-core.js','core.js','movies.js','movies-core.js','analytics.js','analytics-core.js','presentation.js','navigation.js','language.js']){
 const file='assets/'+name,source=fs.readFileSync(path.join(root,file),'utf8');
 const tree=acorn.parse(source,{ecmaVersion:'latest',locations:true});
 walk.simple(tree,{
  Literal(node){if(typeof node.value==='string'&&/[A-Za-z]/.test(node.value))result.push({file,line:node.loc.start.line,kind:'literal',text:node.value});},
  TemplateLiteral(node){const variables=node.expressions.map(e=>source.slice(e.start,e.end));const text=node.quasis.map((q,i)=>(q.value.cooked??q.value.raw)+(i<variables.length?`{${i}}`:'')).join('');if(/[A-Za-z]/.test(text))result.push({file,line:node.loc.start.line,kind:'template',text,variables});}
 });
}
process.stdout.write(JSON.stringify(result,null,2)+'\n');
