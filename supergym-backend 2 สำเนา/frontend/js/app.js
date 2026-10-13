/* SUPER GYM frontend (plain JS). Set USE_MOCK=false once the backend is running.
   No login: the person picks a role (member / trainer / manager) and a profile on index.html.
   Ids may be _id (MongoDB) or id (MySQL). Errors = HTTP 4xx/5xx with {"message": "..."}.
   GET    /api/members   -> [{_id,firstName,lastName,email,phone,plan,endDate,status}]   status: Active | Expired
   POST   /api/members   {firstName,lastName,email,phone,plan} -> member
   DELETE /api/members/:id
   GET    /api/trainers  -> [{_id,firstName,lastName,branch}]
   GET    /api/classes   -> [{_id,className,trainerId,trainer,branch,sessionDate,capacity,booked}]  (trainer = full name)
   GET    /api/bookings  -> [{_id,memberId,memberName,sessionId,className,sessionDate,status}]  status: Booked | Cancelled
   POST   /api/bookings  {memberId,sessionId} -> booking   (reply 409 + message if the class is full or already booked)
   DELETE /api/bookings/:id  -> cancels the booking and frees the seat */
const USE_MOCK = false;
const API_BASE = ''; // '' when Express serves this folder; otherwise e.g. 'http://localhost:3000'
const KEY = 'sg_profile';

/* ---------- demo data (only used when USE_MOCK = true) ---------- */
const day = n => new Date(Date.now() + n * 864e5).toISOString();
const at = (d, h) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h, 0, 0, 0); return x.toISOString(); };
const db = {
  members: [
    {_id:'m1',firstName:'Somchai',lastName:'Dee',email:'somchai@mail.com',phone:'0812345678',plan:'Monthly',endDate:day(3),status:'Active'},
    {_id:'m2',firstName:'Napat',lastName:'Wong',email:'napat@mail.com',phone:'0898765432',plan:'Yearly',endDate:day(200),status:'Active'},
    {_id:'m3',firstName:'Mali',lastName:'Sri',email:'mali@mail.com',phone:'0823456789',plan:'Quarterly',endDate:day(-5),status:'Expired'},
    {_id:'m4',firstName:'Arisa',lastName:'Kaew',email:'arisa@mail.com',phone:'0861112233',plan:'Monthly',endDate:day(12),status:'Active'},
    {_id:'m5',firstName:'Pete',lastName:'Lim',email:'pete@mail.com',phone:'0874445566',plan:'Quarterly',endDate:day(45),status:'Active'},
    {_id:'m6',firstName:'Ploy',lastName:'Rung',email:'ploy@mail.com',phone:'0857778899',plan:'Yearly',endDate:day(300),status:'Active'},
    {_id:'m7',firstName:'Tae',lastName:'Mon',email:'tae@mail.com',phone:'0839990011',plan:'Monthly',endDate:day(6),status:'Active'}],
  trainers: [
    {_id:'t1',firstName:'Pim',lastName:'Chai',branch:'Chiang Mai'},{_id:'t2',firstName:'Beam',lastName:'Ruk',branch:'Chiang Mai'},
    {_id:'t3',firstName:'Nok',lastName:'Sai',branch:'Bangkok'},{_id:'t4',firstName:'Art',lastName:'Wan',branch:'Bangkok'}],
  classes: [
    {_id:'c1',className:'Yoga Flow',trainerId:'t1',trainer:'Pim Chai',branch:'Chiang Mai',sessionDate:at(0,19),capacity:12,booked:11},
    {_id:'c2',className:'HIIT Burn',trainerId:'t2',trainer:'Beam Ruk',branch:'Chiang Mai',sessionDate:at(1,7),capacity:15,booked:6},
    {_id:'c3',className:'Boxing Basics',trainerId:'t3',trainer:'Nok Sai',branch:'Bangkok',sessionDate:at(1,18),capacity:10,booked:10},
    {_id:'c4',className:'Spin Cycle',trainerId:'t2',trainer:'Beam Ruk',branch:'Chiang Mai',sessionDate:at(2,19),capacity:20,booked:9},
    {_id:'c5',className:'Pilates Core',trainerId:'t1',trainer:'Pim Chai',branch:'Chiang Mai',sessionDate:at(3,9),capacity:12,booked:4},
    {_id:'c6',className:'Zumba Party',trainerId:'t4',trainer:'Art Wan',branch:'Bangkok',sessionDate:at(4,18),capacity:25,booked:17},
    {_id:'c7',className:'Strength 101',trainerId:'t3',trainer:'Nok Sai',branch:'Bangkok',sessionDate:at(5,10),capacity:8,booked:3}],
  bookings: [
    {_id:'b1',memberId:'m1',memberName:'Somchai Dee',sessionId:'c1',className:'Yoga Flow',sessionDate:at(0,19),status:'Booked'},
    {_id:'b2',memberId:'m2',memberName:'Napat Wong',sessionId:'c2',className:'HIIT Burn',sessionDate:at(1,7),status:'Booked'},
    {_id:'b3',memberId:'m4',memberName:'Arisa Kaew',sessionId:'c1',className:'Yoga Flow',sessionDate:at(0,19),status:'Booked'},
    {_id:'b4',memberId:'m5',memberName:'Pete Lim',sessionId:'c4',className:'Spin Cycle',sessionDate:at(2,19),status:'Booked'},
    {_id:'b5',memberId:'m1',memberName:'Somchai Dee',sessionId:'c5',className:'Pilates Core',sessionDate:at(3,9),status:'Booked'},
    {_id:'b6',memberId:'m6',memberName:'Ploy Rung',sessionId:'c6',className:'Zumba Party',sessionDate:at(4,18),status:'Booked'}]
};
function mock(method, path, body) {
  const [, , res, id] = path.split('/');
  if (!db[res]) throw new Error('Not found');
  if (method === 'GET') return db[res];
  if (res === 'members' && method === 'POST') {
    const m = {...body, _id: 'm' + Date.now(), status: 'Active', endDate: day({Monthly:30,Quarterly:90,Yearly:365}[body.plan])};
    db.members.push(m); return m;
  }
  if (res === 'members') { db.members = db.members.filter(x => x._id !== id); return {}; }
  if (method === 'POST') {
    const s = db.classes.find(c => c._id === body.sessionId), m = db.members.find(x => x._id === body.memberId);
    if (db.bookings.some(b => b.sessionId === s._id && b.memberId === m._id && b.status === 'Booked')) throw new Error('This member already booked this class');
    if (s.booked >= s.capacity) throw new Error('This class is full');
    s.booked++;
    const b = {_id:'b' + Date.now(), memberId:m._id, memberName:m.firstName + ' ' + m.lastName, sessionId:s._id, className:s.className, sessionDate:s.sessionDate, status:'Booked'};
    db.bookings.push(b); return b;
  }
  const b = db.bookings.find(x => x._id === id);
  if (b && b.status === 'Booked') { b.status = 'Cancelled'; db.classes.find(c => c._id === b.sessionId).booked--; }
  return {};
}

function normalizeMember(m) {
    return {
        ...m,
        _id: String(m.member_id),
        firstName: m.first_name,
        lastName: m.last_name,
        email: m.email,
        phone: m.phone || "",
        plan: m.plan_name || "-",
        endDate: m.end_date || null,
        status: m.membership_status || "None"
    };
}

function normalizeClass(s) {
    return {
        ...s,
        _id: String(s.session_id),
        className: s.class_name,
        trainerId: String(s.trainer_id),
        trainer: s.trainer_name,
        branch: s.branch_name,
        sessionDate: s.session_date,
        capacity: Number(s.capacity),
        booked: Number(s.booked_count || 0)
    };
}
function normalizeBooking(b) {
    return {
        ...b,
        _id: String(b.booking_id),
        memberId: String(b.member_id),
        sessionId: String(b.session_id),
        memberName: b.member_name,
        className: b.class_name,
        sessionDate: b.session_date,
        status: b.status === "Confirmed"
            ? "Booked"
            : b.status
    };
}

/* ---------- API + helpers ---------- */
async function api(method, path, body) {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 150)); return structuredClone(mock(method, path, body)); }
  if (method === "POST" && path === "/api/members") {
    body = {first_name:body.firstName, last_name:body.lastName, email:body.email, phone:body.phone, plan:body.plan};
  }
  if (method === "POST" && path === "/api/bookings") {
    body = {
        member_id: Number(body.memberId),
        session_id: Number(body.sessionId),
        status: "Confirmed"
    };
}

if (method === "DELETE" && /^\/api\/bookings\/\d+$/.test(path)) {
    method = "PATCH";
    path = path + "/cancel";
}
  let res;
  try {
    if (method === "GET" && path === "/api/classes") {
    path = "/api/sessions";
}
    res = await fetch(API_BASE + path, {method, headers:{'Content-Type':'application/json'}, body: body ? JSON.stringify(body) : undefined});
  } catch { throw new Error('Cannot reach the server. Check that the backend is running.'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  if (method === "GET" && path === "/api/members") {
    return data.map(normalizeMember);
}
  if (method === "GET" && path === "/api/sessions") {
    return data.map(normalizeClass);
}
  if (method === "GET" && path === "/api/bookings") {
    return data.map(normalizeBooking);
}
  return data;
}
const $ = s => document.querySelector(s);
const id = x => x._id || x.id;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = d => { // "Today, 18:00" / "Tomorrow, 07:00" / "Fri 16 Oct, 09:00"
  const t = new Date(d), dd = Math.round((new Date(t).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5);
  return (dd === 0 ? 'Today' : dd === 1 ? 'Tomorrow' : t.toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short'})) + ', ' + t.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});
};
const fmtDate = d => new Date(d).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'});
const seats = c => c.capacity - c.booked;
const byDate = (a, b) => new Date(a.sessionDate) - new Date(b.sessionDate);
const tag = (t, k) => `<span class="tag t-${k}">${esc(t)}</span>`;
const statusTag = s => tag(s, {Active:'ok', Booked:'ok', Expired:'bad', Cancelled:'bad'}[s] || 'warn');
const bar = c => { const p = Math.min(100, Math.round(c.booked / c.capacity * 100)); return `<div class="bar"><i class="${p >= 100 ? 'full' : p >= 80 ? 'hi' : ''}" style="width:${p}%"></i></div>`; };
const rows = (arr, fn, empty) => arr.length ? arr.map(fn).join('') : `<tr><td class="empty" colspan="9">${empty}</td></tr>`;
const table = (heads, body) => `<div class="tw"><table><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
const statCards = s => s.map(([n, l, ic]) => `<div class="card stat"><i class="ic">${ic}</i><div><b data-n="${esc(n)}">${esc(n)}</b><span>${l}</span></div></div>`).join('');
const avatar = n => `<span class="av">${esc(n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase())}</span>`;
const nm = n => `<span class="nm">${avatar(n)}${esc(n)}</span>`;
const emojiOf = n => ([['yoga', '🧘'], ['pilates', '🧘'], ['hiit', '🔥'], ['box', '🥊'], ['spin', '🚴'], ['zumba', '💃'], ['strength', '🏋️']].find(([k]) => n.toLowerCase().includes(k)) || [0, '💪'])[1];
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const memberTag = m => { if (!m.endDate) return tag('No membership', 'warn'); const d = Math.ceil((new Date(m.endDate) - Date.now()) / 864e5); return m.status === 'Expired' || d <= 0 ? tag('Expired', 'bad') : d <= 7 ? tag(`Ends in ${d}d`, 'warn') : tag('Active', 'ok'); };
function countUp() { // animate the big numbers on the dashboard
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  document.querySelectorAll('.stat b').forEach(b => {
    const m = b.dataset.n.match(/^(\d+)(%?)$/); if (!m) return;
    const t0 = performance.now();
    (function tick(t) { const p = Math.min(1, (t - t0) / 700); b.textContent = Math.round(+m[1] * (1 - (1 - p) ** 3)) + m[2]; if (p < 1) requestAnimationFrame(tick); })(t0);
  });
}
const formData = f => Object.fromEntries([...new FormData(f)].map(([k, v]) => [k, v.trim()]));
function toast(msg, type = 'success') {
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = (type === 'error' ? '✕  ' : '✓  ') + msg;
  $('#toast').append(t); setTimeout(() => t.remove(), 3500);
}
async function run(fn, okMsg) { // returns the result, or undefined after showing an error toast
  try { const r = await fn(); toast(okMsg); return r; } catch (e) { toast(e.message, 'error'); }
}
const req = label => v => v ? '' : `${label} is required`;
function validate(form, rules) {
  let ok = true;
  for (const [name, test] of Object.entries(rules)) {
    const f = form.elements[name], msg = test(f.value.trim());
    f.classList.toggle('bad', !!msg);
    f.closest('label').querySelector('.err').textContent = msg;
    if (msg) ok = false;
  }
  return ok;
}

/* ---------- role + profile (no login) ---------- */
const NAV = {
  member: [['dashboard','Home'], ['classes','Classes'], ['bookings','My bookings']],
  trainer: [['dashboard','My schedule'], ['classes','All classes']],
  manager: [['dashboard','Dashboard'], ['members','Members'], ['classes','Classes'], ['bookings','Bookings']]
};
const P = (() => { try { const p = JSON.parse(localStorage.getItem(KEY)); return p && NAV[p.role] ? p : null; } catch { return null; } })();
const scope = cs => P && P.branch && P.branch !== 'All branches' ? cs.filter(c => c.branch === P.branch) : cs;
const isMine = c => c.trainerId
    ? String(c.trainerId) === String(P.id)
    : c.trainer === P.name;

const signOut = () => { localStorage.removeItem(KEY); location.replace('index.html'); };

/* ---------- pages ---------- */
const pages = {
  
async index() {
    const form = document.querySelector("#loginForm");
    const errorText = document.querySelector("#loginError");
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        errorText.hidden = true;
        errorText.textContent = "";
        const email = form.elements.email.value.trim();
        const password = form.elements.password.value;
        submitButton.disabled = true;
        submitButton.textContent = "Logging in...";
        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(
                    data.message || "Login failed"
                );
            }
            const user = data.user;
            // Keep the profile format expected by existing pages
            const profile = {
                role: user.role,
                id: String(user.id),
                name: user.name,
                email: user.email
            };
            if (user.role === "manager") {
                profile.branch = user.branch || "All branches";
            }
            localStorage.setItem(
                KEY,
                JSON.stringify(profile)
            );
            window.location.href = "dashboard.html";
        } catch (error) {
            errorText.textContent = error.message;
            errorText.hidden = false;

        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Log In";
        }
    });
},


  async dashboard() {
    const [members, all, bookings] = await Promise.all(['members', 'classes', 'bookings'].map(r => api('GET', '/api/' + r)));
    const classes = scope(all).sort(byDate), active = bookings.filter(b => b.status === 'Booked'), soon = c => new Date(c.sessionDate) > Date.now();
    const dateStr = new Date().toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'long'});
    const hero = (h, p) => `<section class="hero"><div><small>${dateStr}</small><h1>${h}</h1><p>${p}</p></div><img src="img/icon.png" alt=""></section>`;
    const stats = s => `<div class="grid" style="margin-bottom:1rem">${statCards(s)}</div>`;
    let html;
    if (P.role === 'member') {
      const me = members.find(m => id(m) === P.id);
      if (!me) { toast('Profile not found. Choose again.', 'error'); return setTimeout(signOut, 1500); }
      const left = me.endDate ? Math.ceil((new Date(me.endDate) - Date.now()) / 864e5) : 0, mine = active.filter(b => b.memberId === P.id).sort(byDate), next = mine.find(soon);
      const pct = Math.max(0, Math.min(100, Math.round(left / ({Monthly: 30, Quarterly: 90, Yearly: 365}[me.plan] || 30) * 100)));
      html = hero(`${greet()}, ${esc(me.firstName)}`, next ? `Next up: <b>${esc(next.className)}</b>, ${fmt(next.sessionDate)}` : 'Nothing booked yet. Browse the Classes page and grab a spot.')
        + stats([[me.plan, 'Plan', '💳'], [!me.endDate ? 'No plan' : left > 0 ? left + ' days' : 'Expired', 'Left on membership', '⏳'], [mine.length, 'Booked classes', '🎟️']])
        + (me.endDate && left <= 7 ? `<p class="note">Your membership ${left > 0 ? 'ends on ' + fmtDate(me.endDate) : 'has expired'}. Ask the front desk to renew it.</p>` : '')
        + `<section class="card"><div class="row"><h2>Membership</h2>${memberTag(me)}</div><div class="bar"><i style="width:${pct}%"></i></div><small class="mut">${me.endDate ? 'Ends ' + fmtDate(me.endDate) : ''}</small></section>`
        + `<section class="card"><h2>My upcoming classes</h2>${table(['Class', 'When'], rows(mine, b => `<tr><td>${emojiOf(b.className)} ${esc(b.className)}</td><td>${fmt(b.sessionDate)}</td></tr>`, 'Nothing booked yet. Pick a class on the Classes page.'))}</section>`;
    } else if (P.role === 'trainer') {
      const mine = classes.filter(isMine), next = mine.find(soon), roster = c => active.filter(b => b.sessionId === id(c)).map(b => nm(b.memberName)).join('') || '-';
      html = hero(`${greet()}, ${esc(P.name.split(' ')[0])}`, next ? `Next class: <b>${esc(next.className)}</b>, ${fmt(next.sessionDate)}, ${next.booked} booked` : 'No upcoming classes assigned to you.')
        + stats([[mine.length, 'Your sessions', '🏋️'], [mine.reduce((a, c) => a + c.booked, 0), 'Members booked', '👥']])
        + `<section class="card"><h2>My classes</h2>${table(['Class', 'When', 'Branch', 'Seats', 'Members'], rows(mine, c => `<tr><td>${emojiOf(c.className)} ${esc(c.className)}</td><td>${fmt(c.sessionDate)}</td><td>${esc(c.branch)}</td><td>${c.booked}/${c.capacity}</td><td><div class="ros">${roster(c)}</div></td></tr>`, 'No classes assigned to you yet.'))}</section>`;
    } else {
      const cap = classes.reduce((a, c) => a + c.capacity, 0), used = classes.reduce((a, c) => a + c.booked, 0), wk = {}, full = classes.filter(c => seats(c) <= 0);
      const today = classes.filter(c => new Date(c.sessionDate).toDateString() === new Date().toDateString()).length;
      classes.filter(c => { const d = new Date(c.sessionDate) - Date.now(); return d > 0 && d < 7 * 864e5; }).forEach(c => wk[c.trainer] = (wk[c.trainer] || 0) + 1);
      const renew = members.filter(m => {
          const days = m.endDate
              ? (new Date(m.endDate) - Date.now()) / 864e5
              : Infinity;

         return days >= 0 && days <= 7;
      });

      html = hero(`${greet()}, ${P.branch === 'All branches' ? 'team' : esc(P.branch) + ' team'}`, `<b>${today}</b> classes today, <b>${full.length}</b> fully booked, <b>${renew.length}</b> memberships to renew this week.`)
        + stats([[members.length, 'Members', '👥'], [members.filter(m => m.status === 'Active').length, 'Active memberships', '✅'], [classes.length, 'Class sessions', '📅'], [active.length, 'Active bookings', '🎟️'], [(cap ? Math.round(used / cap * 100) : 0) + '%', 'Seats filled', '📊']])
        + `<div class="grid two">
        <section class="card"><h2>Memberships ending within 7 days</h2>${table(['Member', 'Plan', 'Ends', 'Status'], rows(renew, m => `<tr><td>${nm(m.firstName + ' ' + m.lastName)}</td><td>${esc(m.plan)}</td><td>${fmtDate(m.endDate)}</td><td>${memberTag(m)}</td></tr>`, 'No renewals due this week.'))}</section>
        <section class="card"><h2>Fully booked classes</h2>${table(['Class', 'When', 'Trainer'], rows(full, c => `<tr><td>${emojiOf(c.className)} ${esc(c.className)}</td><td>${fmt(c.sessionDate)}</td><td>${esc(c.trainer)}</td></tr>`, 'No class is full right now.'))}</section>
        <section class="card"><h2>Trainer workload this week</h2>${table(['Trainer', 'Sessions'], rows(Object.entries(wk), ([t, n]) => `<tr><td>${nm(t)}</td><td>${n}</td></tr>`, 'No sessions this week.'))}</section>
        <section class="card"><h2>Seats filled by class</h2>${classes.filter(soon).slice(0, 6).map(c => `<div class="fill"><div class="row"><span>${emojiOf(c.className)} ${esc(c.className)}</span><small>${c.booked}/${c.capacity}</small></div>${bar(c)}</div>`).join('') || '<p class="empty">No upcoming classes.</p>'}</section></div>`;
    }
    $('#view').innerHTML = html; countUp();
  },

  async members() {
    const rules = {
      firstName: req('First name'), lastName: req('Last name'), plan: req('Plan'),
      email: v => /^\S+@\S+\.\S+$/.test(v) ? '' : 'Enter a valid email, e.g. name@mail.com',
      phone: v => /^0\d{8,9}$/.test(v) ? '' : 'Phone must be 9-10 digits and start with 0'
    };
    let list = [];
    const render = () => {
      const q = $('#q').value.trim().toLowerCase(), shown = list.filter(m => `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(q));
      $('#count').textContent = list.length;
      $('#rows').innerHTML = rows(shown, m => `<tr><td>${nm(m.firstName + ' ' + m.lastName)}</td><td>${esc(m.email)}</td><td>${esc(m.phone)}</td><td>${esc(m.plan)}</td><td>${m.endDate ? fmtDate(m.endDate) : '-'}</td><td>${memberTag(m)}</td><td><button class="danger" data-del="${esc(id(m))}">Delete</button></td></tr>`, q ? 'No member matches your search.' : 'No members yet. Add the first one above.');
    };
    const load = async () => { list = await api('GET', '/api/members'); render(); };
    $('#q').addEventListener('input', render);
    $('#form').addEventListener('submit', async e => {
      e.preventDefault();
      if (!validate(e.target, rules)) return toast('Fix the highlighted fields', 'error');
      if (await run(() => api('POST', '/api/members', formData(e.target)), 'Member added')) { e.target.reset(); load(); }
    });
    $('#rows').addEventListener('click', async e => {
      const mid = e.target.dataset.del;
      if (mid && confirm('Delete this member?') && await run(() => api('DELETE', '/api/members/' + mid), 'Member deleted')) load();
    });
    await load();
  },

  async classes() {
    let filter = 'all', list = [];
    const tests = {all: () => true, open: c => seats(c) > 3, almost: c => seats(c) > 0 && seats(c) <= 3, full: c => seats(c) <= 0, mine: isMine};
    const action = c => {
      const full = seats(c) <= 0;
      if (P.role === 'member') return `<button data-book="${esc(id(c))}" ${full ? 'disabled' : ''}>${full ? 'Full' : 'Book'}</button>`;
      if (P.role === 'manager') return `<a class="btn ${full ? 'disabled' : ''}" href="bookings.html?session=${encodeURIComponent(id(c))}">Book</a>`;
      return '';
    };
    const render = () => {
      const shown = list.filter(tests[filter]);
      $('#list').innerHTML = shown.length ? shown.map(c => {
        const left = seats(c), hrs = (new Date(c.sessionDate) - Date.now()) / 36e5;
        const badges = (hrs > 0 && hrs < 24 ? tag('Starting soon', 'pink') : '') + (P.role === 'trainer' && isMine(c) ? tag('Your class', 'pink') : '');
        return `<div class="card cl"><div class="row"><span class="emo">${emojiOf(c.className)}</span><div class="grow"><h2>${esc(c.className)}</h2><p class="mut">${fmt(c.sessionDate)}</p></div>${left <= 0 ? tag('Full', 'bad') : tag(left + ' left', left <= 3 ? 'warn' : 'ok')}</div>
        <p class="mut">Trainer ${esc(c.trainer)} at ${esc(c.branch)}</p>${badges ? `<p class="mut">${badges}</p>` : ''}${bar(c)}
        <div class="row"><small>${c.booked} of ${c.capacity} booked</small>${action(c)}</div></div>`;
      }).join('') : '<p class="empty">No classes match this filter.</p>';
    };
    const load = async () => { list = scope(await api('GET', '/api/classes')).sort(byDate); render(); };
    if (P.role === 'trainer') $('[data-f="mine"]').hidden = false;
    $('#chips').addEventListener('click', e => {
      const f = e.target.dataset.f; if (!f) return;
      filter = f; $('#list').classList.add('static');
      document.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.f === f)); render();
    });
    $('#list').addEventListener('click', async e => {
      const sid = e.target.dataset.book;
      if (sid && await run(() => api('POST', '/api/bookings', {memberId: P.id, sessionId: sid}), 'Class booked')) { $('#list').classList.add('static'); load(); }
    });
    await load();
  },

  async bookings() {
    const member = P.role === 'member', rules = {memberId: req('Member'), sessionId: req('Class session')};
    $('#subtitle').textContent = member ? 'Book or cancel your classes' : 'Book or cancel a class for a member';
    const fillClasses = async keep => {
      const list = scope(await api('GET', '/api/classes')).sort(byDate);
      $('#session').innerHTML = '<option value="">Select a class</option>' + list.map(c => `<option value="${esc(id(c))}" ${seats(c) <= 0 ? 'disabled' : ''}>${esc(c.className)}, ${fmt(c.sessionDate)} (${seats(c) <= 0 ? 'full' : seats(c) + ' left'})</option>`).join('');
      if (keep) $('#session').value = keep;
    };
    const load = async () => {
      const list = (await api('GET', '/api/bookings')).filter(b => !member || b.memberId === P.id);
      $('#rows').innerHTML = rows(list, b => `<tr><td>${nm(b.memberName)}</td><td>${emojiOf(b.className)} ${esc(b.className)}</td><td>${fmt(b.sessionDate)}</td><td>${statusTag(b.status)}</td><td>${b.status === 'Booked' ? `<button class="danger" data-cancel="${esc(id(b))}">Cancel</button>` : ''}</td></tr>`, 'No bookings yet.');
    };
    const refresh = () => Promise.all([load(), fillClasses()]);
    $('#form').addEventListener('submit', async e => {
      e.preventDefault();
      if (!validate(e.target, rules)) return toast('Fix the highlighted fields', 'error');
      if (await run(() => api('POST', '/api/bookings', formData(e.target)), 'Class booked')) { e.target.reset(); refresh(); }
    });
    $('#rows').addEventListener('click', async e => {
      const bid = e.target.dataset.cancel;
      if (bid && confirm('Cancel this booking?') && await run(() => api('DELETE', '/api/bookings/' + bid), 'Booking cancelled')) refresh();
    });
    if (member) {
      $('#member').innerHTML = `<option value="${esc(P.id)}">${esc(P.name)}</option>`;
      $('#member').closest('label').hidden = true;
    } else {
      const members = await api('GET', '/api/members');
      $('#member').innerHTML = '<option value="">Select a member</option>' + members.filter(m => m.status === 'Active').map(m => `<option value="${esc(id(m))}">${esc(m.firstName)} ${esc(m.lastName)}</option>`).join('');
    }
    await Promise.all([fillClasses(new URLSearchParams(location.search).get('session')), load()]);
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  const page = document.body.dataset.page;
  if (page !== 'index') {
    if (!P || !NAV[P.role].some(([p]) => p === page)) return location.replace(P ? 'dashboard.html' : 'index.html');
    $('#top').innerHTML = `<a class="brand" href="dashboard.html"><img src="img/icon.png" alt=""><span>SUPER GYM</span></a>
      <nav>${NAV[P.role].map(([p, t]) => `<a href="${p}.html" class="${p === page ? 'on' : ''}">${t}</a>`).join('')}</nav>
      <div class="who">${USE_MOCK ? tag('Demo data', 'warn') : ''}${avatar(P.role === 'manager' ? 'Manager' : P.name)}${tag(P.role[0].toUpperCase() + P.role.slice(1) + ': ' + P.name, 'pink')}<a href="index.html" id="logoutLink">Log out</a></div>`;
  }
  if (page !== 'index') $('#logoutLink')?.addEventListener('click', () => localStorage.removeItem(KEY));
  try { await pages[page](); } catch (e) { toast(e.message, 'error'); }
});
