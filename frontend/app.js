/* ═══════════════════════════════════════════
   BioMatch AI — app.js  (flash-proof build)
   ═══════════════════════════════════════════ */

var API = 'http://127.0.0.1:8000';

/* ── CANVAS ── */
(function(){
  var canvas = document.getElementById('bgCanvas');
  var ctx = canvas.getContext('2d');
  var W, H;
  function resize(){ W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  var BASES = ['A','T','G','C'];
  var COLS  = ['rgba(0,255,136,','rgba(0,229,204,','rgba(0,212,255,','rgba(74,222,128,'];
  function makeP(init){
    return { x: Math.random()*W, y: init ? Math.random()*H : H+20,
      vx:(Math.random()-.5)*.3, vy:-(0.2+Math.random()*.5),
      size:9+Math.random()*7, alpha:0.03+Math.random()*.07,
      base:BASES[Math.floor(Math.random()*4)], ci:Math.floor(Math.random()*4),
      life:0, max:300+Math.random()*400, w:Math.random()*Math.PI*2, ws:0.01+Math.random()*.02 };
  }
  function makeN(){
    return { x:Math.random()*W, y:Math.random()*H,
      vx:(Math.random()-.5)*.4, vy:(Math.random()-.5)*.4, r:2+Math.random()*2 };
  }
  var ps=[], ns=[];
  for(var i=0;i<55;i++) ps.push(makeP(true));
  for(var j=0;j<20;j++) ns.push(makeN());
  function frame(){
    ctx.clearRect(0,0,W,H);
    ns.forEach(function(n){
      n.x+=n.vx; n.y+=n.vy;
      if(n.x<0||n.x>W) n.vx*=-1;
      if(n.y<0||n.y>H) n.vy*=-1;
      ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2);
      ctx.fillStyle='rgba(0,255,136,0.1)'; ctx.fill();
    });
    for(var a=0;a<ns.length;a++) for(var b=a+1;b<ns.length;b++){
      var dx=ns[a].x-ns[b].x, dy=ns[a].y-ns[b].y, d=Math.sqrt(dx*dx+dy*dy);
      if(d<140){ ctx.beginPath(); ctx.moveTo(ns[a].x,ns[a].y); ctx.lineTo(ns[b].x,ns[b].y);
        ctx.strokeStyle='rgba(0,255,136,'+(0.04*(1-d/140))+')'; ctx.lineWidth=1; ctx.stroke(); }
    }
    ps.forEach(function(p){
      p.w+=p.ws; p.x+=p.vx+Math.sin(p.w)*.3; p.y+=p.vy; p.life++;
      if(p.y<-20||p.life>p.max){ var np=makeP(false); Object.assign(p,np); }
      ctx.save(); ctx.globalAlpha=p.alpha;
      ctx.fillStyle=COLS[p.ci]+'1)';
      ctx.font=p.size+'px "IBM Plex Mono",monospace';
      ctx.fillText(p.base,p.x,p.y); ctx.restore();
    });
    requestAnimationFrame(frame);
  }
  frame();
})();

/* ── NAV ── */
document.querySelectorAll('.nav-btn').forEach(function(btn){
  btn.addEventListener('click', function(){
    var t = btn.getAttribute('data-page');
    document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
    document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('page-'+t).classList.add('active');
    if(t==='history') loadHistory();
  });
});

/* ── INPUT ── */
var seqInput    = document.getElementById('seqInput');
var labelInput  = document.getElementById('labelInput');
var charCount   = document.getElementById('charCount');
var classifyBtn = document.getElementById('classifyBtn');
var clearBtn    = document.getElementById('clearBtn');
var errorBox    = document.getElementById('errorBox');

seqInput.addEventListener('input', function(){
  var raw = seqInput.value.toUpperCase().replace(/[^ATGC\n\r\s]/g,'');
  seqInput.value = raw;
  var clean = raw.replace(/\s/g,'');
  charCount.textContent = clean.length + ' bp';
  classifyBtn.disabled = clean.length < 10;
  updateBars(clean);
  errorBox.style.display = 'none';
});

clearBtn.addEventListener('click', function(){
  seqInput.value = '';
  charCount.textContent = '0 bp';
  classifyBtn.disabled = true;
  updateBars('');
  errorBox.style.display = 'none';
});

document.querySelectorAll('.sample-btn').forEach(function(b){
  b.addEventListener('click', function(){
    seqInput.value = b.getAttribute('data-seq');
    seqInput.dispatchEvent(new Event('input'));
  });
});

function updateBars(seq){
  var tot = seq.length || 1;
  var cnt = {A:0,T:0,G:0,C:0};
  for(var i=0;i<seq.length;i++){ var c=seq[i]; if(cnt[c]!==undefined) cnt[c]++; }
  ['A','T','G','C'].forEach(function(b){
    var p = Math.round(cnt[b]/tot*100);
    document.getElementById('bar'+b).style.width = (seq.length ? p : 0)+'%';
    document.getElementById('pct'+b).textContent  = seq.length ? p+'%' : '0%';
  });
}

/* ── CLASSIFY — using XMLHttpRequest, zero page reload risk ── */
classifyBtn.addEventListener('click', function(e){
  e.preventDefault();
  e.stopPropagation();
  runClassify();
});

function runClassify(){
  var sequence = seqInput.value.replace(/\s/g,'').toUpperCase();
  var label    = labelInput.value.trim() || 'Unlabeled';

  if(sequence.length < 10){
    showError('Sequence too short. Minimum 10 bases required.');
    return;
  }

  errorBox.style.display = 'none';
  setLoading(true);

  // Show loading skeleton in result pane RIGHT NOW before XHR
  showSkeleton();

  var xhr = new XMLHttpRequest();
  xhr.open('POST', API+'/classify', true);
  xhr.setRequestHeader('Content-Type','application/json');
  xhr.timeout = 60000;

  xhr.onreadystatechange = function(){
    if(xhr.readyState !== 4) return;
    setLoading(false);
    classifyBtn.disabled = false;

    if(xhr.status === 200){
      try{
        var data = JSON.parse(xhr.responseText);
        renderResult(data);
      } catch(ex){
        showError('Could not parse server response: '+ex.message);
        hideSkeleton();
      }
    } else if(xhr.status === 0){
      showError('Cannot connect to backend at '+API+'. Make sure python main.py is running.');
      hideSkeleton();
    } else {
      var msg = 'HTTP '+xhr.status;
      try{ var err=JSON.parse(xhr.responseText); msg=err.detail||msg; } catch(e2){}
      showError(msg);
      hideSkeleton();
    }
  };

  xhr.ontimeout = function(){
    setLoading(false);
    classifyBtn.disabled = false;
    showError('Request timed out. The AI is taking too long — try a shorter sequence.');
    hideSkeleton();
  };

  xhr.send(JSON.stringify({sequence: sequence, label: label}));
}

function setLoading(on){
  document.querySelector('.btn-inner').style.display  = on ? 'none'  : 'flex';
  document.querySelector('.btn-loader').style.display = on ? 'flex'  : 'none';
  classifyBtn.disabled = on;
}

function showError(msg){
  errorBox.textContent = '⚠ '+msg;
  errorBox.style.display = 'block';
}

function showSkeleton(){
  document.getElementById('emptyState').style.display   = 'none';
  document.getElementById('skeletonState').style.display = 'flex';
  document.getElementById('resultContent').style.display = 'none';
}

function hideSkeleton(){
  document.getElementById('skeletonState').style.display = 'none';
  document.getElementById('emptyState').style.display    = 'flex';
}

/* ── RENDER RESULT ── */
function renderResult(data){
  var c = data.classification;
  var f = data.features;

  // Hide skeleton, show result — result stays visible forever
  document.getElementById('emptyState').style.display    = 'none';
  document.getElementById('skeletonState').style.display = 'none';
  var rc = document.getElementById('resultContent');
  rc.style.display = 'flex';

  // Hero
  setText('rTypeBadge',     c.sequence_type   || 'Unknown');
  setText('rOrganismName',  c.organism_name   || c.organism_guess || 'Unknown Organism');
  setText('rOrganismDomain', c.organism_domain ? '● '+c.organism_domain.toUpperCase() : '');

  // Confidence arc
  var pct = parseInt(c.confidence) || 0;
  setText('confNum', pct+'%');
  var arc = document.getElementById('confArc');
  var circ = 2*Math.PI*40;
  arc.style.strokeDasharray  = circ;
  arc.style.strokeDashoffset = circ;
  setTimeout(function(){
    arc.style.strokeDashoffset = circ*(1-pct/100);
    arc.style.stroke = pct>=75 ? 'var(--green)' : pct>=50 ? 'var(--teal)' : 'var(--amber)';
  }, 100);

  // Summary
  setText('rSummary', c.summary || '');

  // Stats
  setText('sGC',  f.gc_content+'%');
  setText('sAT',  f.at_content+'%');
  setText('sLen', f.length+' bp');
  var pe = document.getElementById('sPromoter');
  pe.textContent = c.is_promoter ? '✓ YES' : '✗ NO';
  pe.className = 'stat-val '+(c.is_promoter ? 'yes' : 'no');

  // Text sections
  setText('rOrganismDetails', c.organism_details   || '—');
  setText('rOrigin',          c.sequence_origin    || '—');
  setText('rFuncPred',        c.functional_prediction || '—');
  setText('rGCInterp',        c.gc_interpretation  || '—');
  setText('rCodon',           c.codon_analysis     || '—');
  setText('rEvolution',       c.evolutionary_notes || '—');

  // Promoter
  var pl = document.getElementById('promoterLabel');
  pl.textContent = c.is_promoter ? '🟢 PROMOTER ANALYSIS — YES' : '🔬 PROMOTER ANALYSIS — NOT A PROMOTER';
  pl.className = 'sc-label'+(c.is_promoter ? ' cyan' : '');
  setText('rPromoterDetails', c.promoter_details || '—');

  // Disease summary
  setText('rDiseaseSummary', c.disease_summary || '');

  // Current diseases
  var cdEl = document.getElementById('rCurrentDiseases');
  var cd   = c.current_diseases || [];
  if(cd.length === 0){
    cdEl.innerHTML = '<p class="no-disease">✓ No current disease associations detected</p>';
  } else {
    cdEl.innerHTML = cd.map(function(d,i){
      return '<div class="disease-item '+(d.type||'associated')+'" style="animation-delay:'+(i*.1)+'s">'+
        '<div class="disease-header">'+
          '<span class="disease-name">'+esc(d.name)+'</span>'+
          '<div class="disease-badges">'+
            '<span class="badge type-'+(d.type||'associated')+'">'+(d.type||'associated').toUpperCase()+'</span>'+
            '<span class="badge sev-'+(d.severity||'low')+'">'+(d.severity||'unknown').toUpperCase()+'</span>'+
          '</div>'+
        '</div>'+
        '<p class="disease-desc">'+esc(d.description)+'</p>'+
        (d.gene_involved ? '<p class="disease-gene">🧬 Gene: '+esc(d.gene_involved)+'</p>' : '')+
      '</div>';
    }).join('');
  }

  // Future diseases
  var fdEl = document.getElementById('rFutureDiseases');
  var fd   = c.future_disease_risks || [];
  if(fd.length === 0){
    fdEl.innerHTML = '<p class="no-disease">✓ No significant future disease risks predicted</p>';
  } else {
    fdEl.innerHTML = fd.map(function(d,i){
      return '<div class="disease-item future-'+(d.probability||'low')+'" style="animation-delay:'+(i*.1)+'s">'+
        '<div class="disease-header">'+
          '<span class="disease-name">'+esc(d.name)+'</span>'+
          '<span class="badge prob-'+(d.probability||'low')+'">'+(d.probability||'low').toUpperCase()+' RISK</span>'+
        '</div>'+
        '<p class="disease-desc">'+esc(d.description)+'</p>'+
        (d.timeframe  ? '<p class="disease-timeframe">⏱ '+esc(d.timeframe)+'</p>' : '')+
        (d.prevention ? '<p class="disease-prevention">'+esc(d.prevention)+'</p>'  : '')+
      '</div>';
    }).join('');
  }

  // Mutation flags
  var ms    = document.getElementById('mutSection');
  var flags = c.mutation_flags || [];
  if(flags.length > 0){
    ms.style.display = 'block';
    document.getElementById('mutList').innerHTML = flags.map(function(f){ return '<li>'+esc(f)+'</li>'; }).join('');
  } else {
    ms.style.display = 'none';
  }

  // K-mer bars
  var kb    = document.getElementById('kmerBars');
  kb.innerHTML = '';
  var kmers = f.top_kmers || {};
  var vals  = Object.values(kmers);
  var maxC  = vals.length ? Math.max.apply(null,vals) : 1;
  Object.keys(kmers).slice(0,6).forEach(function(k){
    var v = kmers[k];
    var p = Math.round(v/maxC*100);
    var row = document.createElement('div');
    row.className = 'kmer-row';
    row.innerHTML = '<span class="kmer-label">'+k+'</span>'+
      '<div class="kmer-track"><div class="kmer-fill" id="kf_'+k+'" style="width:0%"></div></div>'+
      '<span class="kmer-count">'+v+'</span>';
    kb.appendChild(row);
  });
  setTimeout(function(){
    Object.keys(kmers).slice(0,6).forEach(function(k){
      var v = kmers[k], p = Math.round(v/maxC*100);
      var el = document.getElementById('kf_'+k);
      if(el) el.style.width = p+'%';
    });
  }, 150);

  // Recommendations
  document.getElementById('recList').innerHTML = (c.recommendations||[]).map(function(r){
    return '<li>'+esc(r)+'</li>';
  }).join('');
}

function setText(id, txt){
  var el = document.getElementById(id);
  if(el) el.textContent = txt;
}

function esc(str){
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── HISTORY ── */
function loadHistory(){
  var list    = document.getElementById('historyList');
  var empty   = document.getElementById('histEmpty');
  var countEl = document.getElementById('histCount');
  list.innerHTML = '';

  var xhr = new XMLHttpRequest();
  xhr.open('GET', API+'/history', true);
  xhr.onreadystatechange = function(){
    if(xhr.readyState !== 4) return;
    if(xhr.status !== 200){
      empty.hidden = false;
      empty.querySelector('p').textContent = 'Could not load history. Is the backend running?';
      return;
    }
    var data = JSON.parse(xhr.responseText);
    countEl.textContent = data.length+' record'+(data.length!==1?'s':'');
    if(data.length===0){ empty.hidden=false; return; }
    empty.hidden = true;

    data.forEach(function(item, idx){
      var c  = item.classification;
      var cd = c.current_diseases    || [];
      var fd = c.future_disease_risks || [];
      var date = new Date(item.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});

      var el = document.createElement('div');
      el.className = 'hist-card';
      el.style.animationDelay = (idx*.06)+'s';

      el.innerHTML =
        '<div class="hist-card-header">'+
          '<div class="hist-dot"></div>'+
          '<div class="hist-head-info">'+
            '<div class="hist-type">'+esc(c.sequence_type||'Unknown')+'</div>'+
            '<div class="hist-organism">'+esc(c.organism_name||c.organism_guess||'—')+(c.organism_domain?' · '+esc(c.organism_domain):'')+'</div>'+
            '<div class="hist-seq">'+esc(item.label)+' · '+esc(item.sequence)+'</div>'+
          '</div>'+
          '<div class="hist-head-meta">'+
            '<span class="hist-conf">'+esc(c.confidence||'—')+'</span>'+
            '<span class="hist-date">'+date+'</span>'+
            '<span class="hist-toggle">▼</span>'+
          '</div>'+
        '</div>'+
        '<div class="hist-card-body">'+
          '<p class="hist-summary-text">'+esc(c.summary||'')+'</p>'+
          '<div class="hist-grid">'+
            histBlock('🌍 ORGANISM',         c.organism_details||'—',         '')+
            histBlock('🧬 SEQUENCE ORIGIN',  c.sequence_origin||'—',          '')+
            histBlock('🔬 PROMOTER',         (c.is_promoter?'✓ YES — ':'✗ NO — ')+(c.promoter_details||'—'), c.is_promoter?'green':'')+
            histBlock('⚙️ FUNCTION',         c.functional_prediction||'—',    '')+
            histBlock('🌿 EVOLUTION',        c.evolutionary_notes||'—',       '')+
            histBlock('🔡 CODON ANALYSIS',   c.codon_analysis||'—',           '')+
          '</div>'+
          (cd.length>0 ?
            '<div class="hist-disease-section">'+
              '<div class="hist-disease-title red">🦠 CURRENT DISEASES</div>'+
              cd.map(function(d){
                return '<div class="disease-item '+(d.type||'associated')+'" style="margin-bottom:8px">'+
                  '<div class="disease-header"><span class="disease-name">'+esc(d.name)+'</span>'+
                  '<span class="badge type-'+(d.type||'associated')+'">'+(d.type||'').toUpperCase()+'</span></div>'+
                  '<p class="disease-desc">'+esc(d.description)+'</p>'+
                  (d.gene_involved?'<p class="disease-gene">🧬 '+esc(d.gene_involved)+'</p>':'')+
                '</div>';
              }).join('')+
            '</div>' : '')+
          (fd.length>0 ?
            '<div class="hist-disease-section">'+
              '<div class="hist-disease-title amber">⚠️ FUTURE RISKS</div>'+
              fd.map(function(d){
                return '<div class="disease-item future-'+(d.probability||'low')+'" style="margin-bottom:8px">'+
                  '<div class="disease-header"><span class="disease-name">'+esc(d.name)+'</span>'+
                  '<span class="badge prob-'+(d.probability||'low')+'">'+(d.probability||'low').toUpperCase()+' RISK</span></div>'+
                  '<p class="disease-desc">'+esc(d.description)+'</p>'+
                  (d.timeframe?'<p class="disease-timeframe">⏱ '+esc(d.timeframe)+'</p>':'')+
                  (d.prevention?'<p class="disease-prevention">'+esc(d.prevention)+'</p>':'')+
                '</div>';
              }).join('')+
            '</div>' : '')+
          '<div class="hist-tags">'+
            (c.recommendations||[]).map(function(r){ return '<span class="hist-tag green">→ '+esc(r)+'</span>'; }).join('')+
          '</div>'+
        '</div>';

      el.querySelector('.hist-card-header').addEventListener('click', function(){
        var body   = el.querySelector('.hist-card-body');
        var toggle = el.querySelector('.hist-toggle');
        var isOpen = body.classList.contains('open');
        body.classList.toggle('open', !isOpen);
        toggle.classList.toggle('open', !isOpen);
      });

      list.appendChild(el);
    });
  };
  xhr.send();
}

function histBlock(label, val, cls){
  return '<div class="hist-block">'+
    '<div class="hist-block-label">'+label+'</div>'+
    '<div class="hist-block-val '+cls+'">'+esc(val)+'</div>'+
  '</div>';
}

document.getElementById('clearHistBtn').addEventListener('click', function(){
  if(!confirm('Clear all analysis history?')) return;
  var xhr = new XMLHttpRequest();
  xhr.open('DELETE', API+'/history', true);
  xhr.onreadystatechange = function(){ if(xhr.readyState===4) loadHistory(); };
  xhr.send();
});