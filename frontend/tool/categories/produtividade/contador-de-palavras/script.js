(()=> {
  const text=document.querySelector("#text");
  const els={
    words:document.querySelector("#words"),
    chars:document.querySelector("#chars"),
    charsNoSpace:document.querySelector("#charsNoSpace"),
    lines:document.querySelector("#lines"),
    paragraphs:document.querySelector("#paragraphs"),
    read:document.querySelector("#read")
  };
  const copyButton=document.querySelector("#copy");
  const clearButton=document.querySelector("#clear");
  const sampleButton=document.querySelector("#sample");
  const status=document.querySelector("#status");

  function update(){
    const value=text.value;
    const trimmed=value.trim();
    const words=trimmed?trimmed.split(/\s+/).length:0;
    const lines=value?value.split(/\r?\n/).length:0;
    const paragraphs=trimmed?trimmed.split(/\n\s*\n+/).length:0;
    const minutes=words?Math.max(1,Math.ceil(words/200)):0;

    els.words.textContent=words.toLocaleString("pt-PT");
    els.chars.textContent=value.length.toLocaleString("pt-PT");
    els.charsNoSpace.textContent=value.replace(/\s/g,"").length.toLocaleString("pt-PT");
    els.lines.textContent=lines.toLocaleString("pt-PT");
    els.paragraphs.textContent=paragraphs.toLocaleString("pt-PT");
    els.read.textContent=minutes?minutes+" min":"0 min";
  }

  function announce(message){
    status.textContent=message;
    window.clearTimeout(announce.timer);
    announce.timer=window.setTimeout(()=>{status.textContent=""},1800);
  }

  sampleButton?.addEventListener("click",()=>{
    text.value="A Nexauren Story reúne ferramentas simples para tarefas digitais do dia a dia. Este é um exemplo de texto para testar palavras, caracteres, linhas, parágrafos e tempo de leitura.";
    update();
    text.focus();
    announce("Texto de exemplo inserido.");
  });

  clearButton?.addEventListener("click",()=>{
    text.value="";
    update();
    text.focus();
    announce("Texto limpo.");
  });

  copyButton?.addEventListener("click",async()=>{
    if(!text.value){
      announce("Não há texto para copiar.");
      text.focus();
      return;
    }
    try{
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(text.value);
      }else{
        text.focus();
        text.select();
        document.execCommand("copy");
        text.setSelectionRange(text.value.length,text.value.length);
      }
      const original=copyButton.textContent;
      copyButton.textContent="Copiado ✓";
      announce("Texto copiado.");
      window.setTimeout(()=>{copyButton.textContent=original},1200);
    }catch{
      announce("Não foi possível copiar automaticamente.");
    }
  });

  text.addEventListener("input",update);
  update();
})();
