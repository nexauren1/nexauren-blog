const input=document.getElementById('input');const output=document.getElementById('output');const status=document.getElementById('status');
document.getElementById('encode').onclick=()=>{try{output.value=btoa(unescape(encodeURIComponent(input.value)));status.textContent='Codificado com sucesso.'}catch(e){status.textContent='Erro ao codificar.'}};
document.getElementById('decode').onclick=()=>{try{output.value=decodeURIComponent(escape(atob(input.value)));status.textContent='Descodificado com sucesso.'}catch(e){status.textContent='Base64 inválido.'}};
document.getElementById('copy').onclick=()=>navigator.clipboard.writeText(output.value);
document.getElementById('clear').onclick=()=>{input.value='';output.value='';status.textContent=''};