/* ===== STATE ===== */
        let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        let history = JSON.parse(localStorage.getItem("history")) || [];
        let streak = +localStorage.getItem("streak") || 0;
        let filter = "all";
        let lastClosedDay = localStorage.getItem("lastClosedDay");

        /* ===== ELEMENTS ===== */
        const taskList = document.getElementById("taskList");
        const welcomeText = document.getElementById("welcomeText");
        const profileImg = document.getElementById("profileImg");
        const nameInput = document.getElementById("nameInput");
        const todayDate = document.getElementById("todayDate");
        const menu = document.getElementById("menu");
        const todoBox = document.getElementById("todoBox");
        const chart = document.getElementById("performanceChart");

        /* ===== INIT ===== */
        welcomeText.textContent = `Welcome, ${localStorage.getItem("name") || "User"}`;
        nameInput.value = localStorage.getItem("name") || "";
        profileImg.src = localStorage.getItem("photo") || "https://via.placeholder.com/90";
        todayDate.textContent = new Date().toLocaleDateString(undefined, {
            weekday: "long", day: "2-digit", month: "short", year: "numeric"
        });
        chart.style.display = localStorage.getItem("showChart") === "true" ? "block" : "none";

        /* ===== UI ===== */
        function toggleMenu() { menu.classList.toggle("show"); }
        function saveName() {
            localStorage.setItem("name", nameInput.value.trim());
            welcomeText.textContent = `Welcome, ${nameInput.value.trim()}`;
            menu.classList.remove("show");
        }
        function pickProfile() { profileInput.click(); }
        profileInput.onchange = e => {
            const r = new FileReader();
            r.onload = () => { profileImg.src = r.result; localStorage.setItem("photo", r.result); };
            r.readAsDataURL(e.target.files[0]);
        };
        function toggleTheme() { document.body.classList.toggle("light"); }
        function setPageBg(c) { document.body.style.background = c; }
        function setCardBg(c) { todoBox.style.background = c; }
        function toggleChart() {
            const show = chart.style.display !== "block";
            chart.style.display = show ? "block" : "none";
            localStorage.setItem("showChart", show);
        }

        /* ===== TASK LOGIC ===== */
        function addTask() {
            if (!taskInput.value || !duration.value) return;
            const mins = unit.value === "hr" ? duration.value * 60 : +duration.value;
            tasks.push({
                text: taskInput.value,
                from: fromTime.value,
                mins,
                createdAt: Date.now(),
                status: "pending"
            });
            taskInput.value = ""; fromTime.value = ""; duration.value = "";
            render();
        }

        function isOverdue(t) {
            if (!t.from || t.status !== "pending") return false;
            const [h, m] = t.from.split(":").map(Number);
            const d = new Date();
            d.setHours(h); d.setMinutes(m + t.mins); d.setSeconds(0);
            return Date.now() > d.getTime();
        }

        function mark(i, s) {
            tasks[i].status = s;
            render();
            tryAutoEndDay(); // 🔑 auto reset after last task
        }

        function removeTask(i) {
            tasks.splice(i, 1);
            render();
            tryAutoEndDay();
        }

        /* ===== DAY END (MANUAL + AUTO) ===== */
        function endDay(mode = "manual") {
            const today = new Date().toDateString();

            // prevent duplicate AUTO close
            if (lastClosedDay === today && mode === "auto") return;

            const total = tasks.length;
            const doneCount = tasks.filter(t => t.status === "done").length;
            const percent = total ? Math.round(doneCount / total * 100) : 0;

            // only save analytics ONCE per day
            if (lastClosedDay !== today) {
                history.push({ date: today, total, done: doneCount, percent, mode });
                if (history.length > 15) history.shift();
                localStorage.setItem("history", JSON.stringify(history));

                streak = percent >= 70 ? streak + 1 : 0;
                localStorage.setItem("streak", streak);
            }

            // mark day closed
            lastClosedDay = today;
            lastCloseMode = mode;
            localStorage.setItem("lastClosedDay", today);
            localStorage.setItem("lastCloseMode", mode);

            // reset tasks ONLY on manual OR first auto
            tasks = [];

            render();
        }


        function tryAutoEndDay() {
            const today = new Date().toDateString();
            if (lastClosedDay === today) return;

            const pending = tasks.filter(t => t.status === "pending").length;
            if (pending !== 0) return;

            endDay("auto");
        }


        /* ===== FILTER ===== */
        function setFilter(f, b) {
            filter = f;
            document.querySelectorAll(".filters button").forEach(x => x.classList.remove("active"));
            b.classList.add("active");
            render();
        }

        /* ===== SAVE ===== */
        function saveTasks() {
            localStorage.setItem("tasks", JSON.stringify(tasks));
            alert("Saved");
        }

        /* ===== CHART ===== */
        function drawChart() {
            if (chart.style.display !== "block") return;
            const ctx = chart.getContext("2d");
            ctx.clearRect(0, 0, chart.width, chart.height);
            history.forEach((d, i) => {
                const h = (d.percent / 100) * (chart.height - 30);
                ctx.fillStyle = "#38bdf8";
                ctx.fillRect(10 + i * 22, chart.height - h - 10, 14, h);
            });
        }
        function formatDuration(mins) {
            const h = Math.floor(mins / 60);
            const m = mins % 60;

            if (h === 0) return `${m} min`;
            return `${h}:${m.toString().padStart(2, "0")} hr`;
        }


        /* ===== RENDER ===== */
        function render() {
            taskList.innerHTML = "";
            let d = 0, n = 0, p = 0;

            tasks.forEach((t, i) => {
                if (t.status === "done") d++;
                else if (t.status === "not") n++;
                else p++;

                if (filter !== "all" && t.status !== filter) return;

                const li = document.createElement("li");
                li.className = t.status;
                if (isOverdue(t)) li.classList.add("overdue");

                li.innerHTML = `
      <div class="task-info">
        <div>${t.text}</div>
        ${t.from ? `<div class="task-time">⏰ ${t.from}</div>` : ""}
        <div class="task-time">⏱ ${formatDuration(t.mins)}</div>

      </div>
      <div class="actions">
        <button class="done-btn" onclick="mark(${i},'done')">✔</button>
        <button class="not-btn" onclick="mark(${i},'not')">✖</button>
        <button onclick="removeTask(${i})">🗑</button>
      </div>`;
                taskList.appendChild(li);
            });

            total.textContent = tasks.length;
            done.textContent = d;
            not.textContent = n;
            pending.textContent = p;
            percent.textContent = tasks.length ? Math.round(d / tasks.length * 100) + "%" : "0%";
            streak.textContent = streak;

            drawChart();
            localStorage.setItem("tasks", JSON.stringify(tasks));
        }

        render();