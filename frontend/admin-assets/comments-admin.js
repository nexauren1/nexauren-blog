(function(){
  function esc(v){
    return String(v == null ? "" : v)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }
  function formatDate(v){
    try{return new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(new Date(v));}
    catch(e){return v || "—";}
  }
  function message(root,title,text){
    root.innerHTML='<div class="view-header"><div><div class="eyebrow">Moderação do Blog</div><h1>Comentários</h1><p>'+esc(text)+'</p></div></div><div class="empty-state"><h2>'+esc(title)+'</h2><p>'+esc(text)+'</p><button class="secondary" id="comments-retry">↻ Tentar novamente</button></div>';
    var retry=document.getElementById("comments-retry");
    if(retry) retry.onclick=window.NexaurenLoadComments;
  }
  window.NexaurenLoadComments=async function(){
    var root=document.getElementById("view-comments");
    if(!root)return;
    root.innerHTML='<div class="view-header"><div><div class="eyebrow">Moderação do Blog</div><h1>Comentários</h1><p>A carregar comentários…</p></div></div>';
    try{
      var d=await window.api("/api/admin/comments");
      var s=d.stats||{}, rows=d.comments||[];
      var html='<div class="view-header"><div><div class="eyebrow">Moderação do Blog</div><h1>Comentários</h1><p>Revise e modere os comentários dos artigos.</p></div><button class="secondary" id="comments-refresh">↻ Atualizar</button></div>';
      html+='<div class="stats comments-admin-stats"><div class="stat"><div class="value">'+Number(s.total||0)+'</div><div class="label">Total</div></div><div class="stat"><div class="value">'+Number(s.pending||0)+'</div><div class="label">Pendentes</div></div><div class="stat"><div class="value">'+Number(s.approved||0)+'</div><div class="label">Aprovados</div></div><div class="stat"><div class="value">'+Number(s.reports||0)+'</div><div class="label">Denúncias pendentes</div></div></div>';
      html+='<div class="panel"><div class="panel-pad"><div class="panel-title">Comentários recentes</div></div>';
      if(rows.length){
        rows.forEach(function(c){
          html+='<article class="comment-admin-row" data-comment="'+esc(c.id)+'"><div><strong>'+esc(c.author_name)+'</strong><div class="comment-admin-meta">'+formatDate(c.created_at)+' · '+esc(c.post_title||"Artigo")+'</div><div class="comment-admin-body">'+esc(c.body)+'</div><div class="comment-admin-meta">'+Number(c.like_count||0)+' gostos · '+Number(c.dislike_count||0)+' não gostos'+(Number(c.report_count||0)?' · '+Number(c.report_count)+' denúncia(s) pendente(s)':"")+'</div></div><div class="comment-admin-actions"><select data-status><option value="pending"'+(c.status==="pending"?" selected":"")+'>Pendente</option><option value="approved"'+(c.status==="approved"?" selected":"")+'>Aprovado</option><option value="rejected"'+(c.status==="rejected"?" selected":"")+'>Rejeitado</option><option value="hidden"'+(c.status==="hidden"?" selected":"")+'>Oculto</option></select><button class="secondary" data-save>Guardar</button><button class="danger-btn" data-delete>Eliminar</button></div></article>';
        });
      }else{
        html+='<div class="empty-state"><h2>Sem comentários</h2><p>Ainda não existem comentários para moderar.</p></div>';
      }
      html+='</div>';
      root.innerHTML=html;
      var refresh=document.getElementById("comments-refresh");
      if(refresh)refresh.onclick=window.NexaurenLoadComments;
      root.querySelectorAll("[data-save]").forEach(function(btn){
        btn.onclick=async function(){
          var row=btn.closest("[data-comment]"), id=row.getAttribute("data-comment"), status=row.querySelector("[data-status]").value;
          btn.disabled=true;
          try{await window.api("/api/admin/comments/"+encodeURIComponent(id),{method:"PUT",body:JSON.stringify({status:status})});if(window.toast)window.toast("Comentário atualizado.");await window.NexaurenLoadComments();}
          catch(e){if(window.toast)window.toast(e.message||"Erro ao atualizar.","error");}
          btn.disabled=false;
        };
      });
      root.querySelectorAll("[data-delete]").forEach(function(btn){
        btn.onclick=async function(){
          var row=btn.closest("[data-comment]"), id=row.getAttribute("data-comment");
          if(!window.confirm("Eliminar este comentário?"))return;
          btn.disabled=true;
          try{await window.api("/api/admin/comments/"+encodeURIComponent(id),{method:"DELETE"});if(window.toast)window.toast("Comentário eliminado.");await window.NexaurenLoadComments();}
          catch(e){if(window.toast)window.toast(e.message||"Erro ao eliminar.","error");}
          btn.disabled=false;
        };
      });
    }catch(e){
      message(root,"Comentários indisponíveis",e && e.message ? e.message : "Não foi possível carregar os comentários.");
    }
  };
})();