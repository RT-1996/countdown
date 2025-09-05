// HTML要素を取得、変数に代入
const eventNameInput = document.getElementById("event-name");
const eventDateInput = document.getElementById("event-date");
const eventTimeInput = document.getElementById("event-time");
const addButton = document.getElementById("add-button");
const countdownList = document.getElementById("countdown-list");

// カウントダウン情報を保持する配列
const events = []; //複数のイベント情報を格納するため空の配列を定義
let countdownInterval;

// ローカルストレージにデータを保存する関数
function saveData() {
    localStorage.setItem("events", JSON.stringify(events));
}

// ローカルストレージからデータを読み込む関数
function loadData() {
    const savedEvents = localStorage.getItem("events");
    if (savedEvents) {
        // JSON文字列をJavaScriptのオブジェクトに変換
        const parsedEvents = JSON.parse(savedEvents);

        // Dateオブジェクトとして復元
        parsedEvents.forEach(event => {
            event.targetDate = new Date(event.targetDate);
            // 復元した配列を末尾に追加
            events.push(event);
        });

        // 復元したイベントでUIを再構築(一応もう一度日付順に成型する)
        events.sort((a, b) => a.targetDate - b.targetDate);
        events.forEach(event => createCountdownItem(event));
    }
}

// 新しいイベントを追加する処理
addButton.addEventListener("click", () => {
    // trim() 両端から空白を取り除く
    let eventName = eventNameInput.value.trim();
    // イベント名が入力されなかったときのデフォルトを設定
    if (eventName === "") {
        eventName = "カウントダウン";
    }

    // 日付と時間を取得、変数に代入
    const selectedDate = eventDateInput.value;
    const selectedTime = eventTimeInput.value;

    // 両方入力されているとき
    if (selectedDate && selectedTime) {
        // "T"→日付と文字を区切る、":00"→秒を指定(event-timeで秒を取得しないため)
        const combinedDateTimeString = `${selectedDate}T${selectedTime}:00`;
        // 取得した日付を格納
        const targetDate = new Date(combinedDateTimeString);

        // 精査した情報をここに格納
        const newEvent = {
            // Date.now→1970年1月1日0時0分0秒から現在までの経過時間をミリ秒で返す
            id: Date.now(),
            name: eventName,
            targetDate: targetDate
        };
        // 作成したnewEventオブジェクトをevents配列に追加
        events.push(newEvent);

        // 通知の許可を求める
        if (Notification.permission === "default") {
            Notification.requestPermission();
        }

        // イベント配列を昇順に並び替え
        events.sort((a, b) => a.targetDate - b.targetDate);

        // HTMLリストをクリア
        countdownList.innerHTML = "";

        //　昇順に再構築
        events.forEach(event => createCountdownItem(event));

        // イベント追加後、入力欄をクリア
        eventNameInput.value = "";
        eventDateInput.value = "";
        eventTimeInput.value = "";

        // タイマーがまだ動いていなければ開始
        if (!countdownInterval) {
            //即座に表示
            updateAllCountdowns();
            countdownInterval = setInterval(updateAllCountdowns, 1000);
        }
        // イベント追加後、ローカルストレージに保存
        saveData();
        // 入力されていない場合メッセージ
    } else {
        alert("日付と時刻の両方を選択してください");
    }
});

// 新しいカウントダウン項目をHTMLに作成する関数
function createCountdownItem(event) {
    const item = document.createElement("div");
    // CSSを参照するためのクラス付与
    item.className = "countdown-item";
    // 個別に操作するための一意のidを作成
    item.id = `item-${event.id}`;
    //HTMLの文字列を作成
    item.innerHTML = `
    <div class="countdown-content">
        <h2 class="editable-name" data-id="${event.id}">${event.name}</h2>
        <div class="date-and-countdown">
            <p class="target-date"></p>
        </div>
    </div>
    <p id="countdown-${event.id}"></p>
    <button class="delete-button" data-id="${event.id}">削除</button>
    `;
    countdownList.appendChild(item);

    // 設定した日付を表示
    const targetDateElement = item.querySelector(".target-date");
    const formattedDate = formatTargetDate(event.targetDate);
    targetDateElement.textContent = `${formattedDate}`;

    // 削除ボタンのイベント設定
    const deleteButton = item.querySelector(".delete-button");
    deleteButton.addEventListener("click", () => {
        deleteEvent(event.id);
    });
}

// イベントを削除する関数
function deleteEvent(eventId) {
    // 配列から該当するインデックスを検索
    const itemIndex = events.findIndex(event => event.id === eventId);
    if (itemIndex > -1) {
        // itemIndexに格納されたインデックスを削除
        events.splice(itemIndex, 1);
    }

    // HTMLから要素を削除
    const itemElement = document.getElementById(`item-${eventId}`);
    if (itemElement) {
        itemElement.remove();
    }

    //イベントが一つもなくなったらタイマーを停止
    if (events.length === 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    // ローカルストレージを更新
    saveData();
}

// 日付を整形して返す関数(設定した日時)
function formatTargetDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    // 時刻を2桁表示にする 文字列が指定した長さに満たない場合指定した文字を先頭に追加
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}年${month}月${day}日 ${hours}:${minutes}`;
}

// カウントダウンを更新する関数
function updateAllCountdowns() {
    //　events配列に格納された各イベントを繰り返して呼び出す
    events.forEach(event => {
        const now = new Date();
        const diff = event.targetDate.getTime() - now.getTime();
        //　HTML要素を取得
        const displayElement = document.getElementById(`countdown-${event.id}`);

        if (!displayElement) return; //何もなければ実行しない

        // 目標日時になったとき
        if (diff <= 0) {
            //　event.notifiedがfalseかつ通知が許可されているならば
            if (!event.notified && Notification.permission === "granted") {
                // 通知を呼び出す
                new Notification(`${event.name}`);
                // notifiedプロパティをtrueに設定して、次回以降は通知しないようにする
                event.notified = true;
                // 変更をローカルストレージに保存
                saveData();
            }

            displayElement.textContent = "✔";
            displayElement.style.color = "#96c78c"
            return;
        }

        // 秒、分、時、日を定義
        const second = 1000;
        const minute = second * 60;
        const hour = minute * 60;
        const day = hour * 24;

        // カレンダー上の日付差（時刻は無視）
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const targetDay = new Date(event.targetDate.getFullYear(), event.targetDate.getMonth(), event.targetDate.getDate());
        // 切り上げすることで日付差を求める
        const dayDiff = Math.ceil((targetDay - today) / day);

        // 残り時間を表示させるための空の入れ物
        let displayText = "";

        // 日付差が1日以上かつ24時間以上は日数表示
        if (dayDiff >= 1 && diff >= day) {
            displayText = `${dayDiff}日`;
        } else {
            // 24時間未満、日付差が0なら時間、分、秒で表示
            const hours = Math.floor(diff / hour);
            const minutes = Math.floor((diff % hour) / minute);
            const seconds = Math.floor((diff % minute) / second);

            if (hours > 0) {
                displayText = `${hours}時間`;
            } else if (minutes > 0) {
                displayText = `${minutes}分`;
            } else {
                displayText = `${seconds}秒`;
            }
        }
        // 書き換え処理
        displayElement.textContent = `残り: ${displayText}`;
    });
}

//　初期化処理
loadData()
updateAllCountdowns();
if (events.length > 0) {
    countdownInterval = setInterval(updateAllCountdowns, 1000);
}
