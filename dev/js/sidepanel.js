document.addEventListener('DOMContentLoaded', () => {
  const sheetBody = document.getElementById('sheetBody');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const copyCsvBtn = document.getElementById('copyCsvBtn');
  const copyIcon = document.getElementById('copyIcon');
  const checkIcon = document.getElementById('checkIcon');
  const copyMdBtn = document.getElementById('copyMdBtn');
  const copyMdIcon = document.getElementById('copyMdIcon');
  const checkMdIcon = document.getElementById('checkMdIcon');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const contextMenu = document.getElementById('contextMenu');

  let targetRowIndex = -1;
  let targetColIndex = -1;
  let lastSelectedRowIndex = -1; // Shift選択用

  // 保存データの読み込み（デフォルト: 1行×3列）
  chrome.storage.local.get(['sheetData'], (result) => {
    const data = result.sheetData || [
      ['', '', '']
    ];
    renderSheet(data);
  });

  // シートの描画
  function renderSheet(data) {
    sheetBody.innerHTML = '';
    if (!data || data.length === 0) {
      data = [['']];
    }
    
    data.forEach((rowData) => {
      const tr = document.createElement('tr');
      
      // 行番号セル
      const th = document.createElement('td');
      th.className = 'text-center text-muted align-middle row-header';
      tr.appendChild(th);

      rowData.forEach((cellData) => {
        const td = document.createElement('td');
        td.contentEditable = "true";
        td.className = 'sheet-cell align-middle';
        td.innerText = cellData;
        tr.appendChild(td);
      });

      sheetBody.appendChild(tr);
    });

    updateRowNumbers();
    attachEvents();
  }

  // 行番号の更新
  function updateRowNumbers() {
    Array.from(sheetBody.children).forEach((tr, index) => {
      tr.children[0].textContent = index + 1;
    });
  }

  // イベントバインド
  function attachEvents() {
    const cells = sheetBody.querySelectorAll('.sheet-cell');

    cells.forEach(cell => {
      cell.removeEventListener('input', saveData);
      cell.addEventListener('input', saveData);

      cell.removeEventListener('keydown', handleKeyDown);
      cell.addEventListener('keydown', handleKeyDown);

      cell.removeEventListener('paste', handlePaste);
      cell.addEventListener('paste', handlePaste);
    });

    // 行選択用（行番号セルのクリック）
    sheetBody.querySelectorAll('.row-header').forEach((rowHeader, idx) => {
      rowHeader.removeEventListener('click', handleRowSelect);
      rowHeader.addEventListener('click', (e) => handleRowSelect(e, idx));
    });

    sheetBody.removeEventListener('contextmenu', handleContextMenu);
    sheetBody.addEventListener('contextmenu', handleContextMenu);
  }

  // 行選択処理（単体 / Ctrl・Cmd選択 / Shift範囲選択）
  function handleRowSelect(e, index) {
    const rows = Array.from(sheetBody.children);

    if (e.shiftKey && lastSelectedRowIndex !== -1) {
      // Shiftキーによる範囲選択
      const start = Math.min(lastSelectedRowIndex, index);
      const end = Math.max(lastSelectedRowIndex, index);
      rows.forEach((tr, idx) => {
        if (idx >= start && idx <= end) {
          tr.classList.add('selected-row');
        }
      });
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl / Cmd キーによる個別トグル選択
      rows[index].classList.toggle('selected-row');
      lastSelectedRowIndex = index;
    } else {
      // 通常の単一選択（既存の選択をクリア）
      rows.forEach(tr => tr.classList.remove('selected-row'));
      rows[index].classList.add('selected-row');
      lastSelectedRowIndex = index;
    }
  }

  // キーボード入力制御（改行制御 & Tabキー拡張）
  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      return;
    }

    if (e.key === 'Tab' && !e.shiftKey) {
      const td = e.target.closest('td');
      const tr = td.parentElement;
      const allRows = Array.from(sheetBody.children);
      const isLastRow = tr === allRows[allRows.length - 1];
      
      const rowCells = Array.from(tr.querySelectorAll('.sheet-cell'));
      const isLastCol = td === rowCells[rowCells.length - 1];

      if (isLastRow && isLastCol) {
        e.preventDefault();

        const data = getTableData();
        const colCount = data[0].length;
        data.push(new Array(colCount).fill(''));
        renderSheet(data);
        saveData();

        setTimeout(() => {
          const newLastRow = sheetBody.lastElementChild;
          if (newLastRow) {
            const firstCell = newLastRow.querySelectorAll('.sheet-cell')[0];
            if (firstCell) firstCell.focus();
          }
        }, 0);
      }
    }
  }

  // 貼り付け時の改行除去
  function handlePaste(e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text');
    const cleanText = text.replace(/[\r\n]+/g, ' ');
    document.execCommand('insertText', false, cleanText);
  }

  // コンテキストメニュー処理
  function handleContextMenu(e) {
    const td = e.target.closest('td');
    if (!td) return;

    e.preventDefault();
    const tr = td.parentElement;
    targetRowIndex = Array.from(sheetBody.children).indexOf(tr);
    targetColIndex = td.classList.contains('row-header') ? -1 : Array.from(tr.children).indexOf(td) - 1;

    // 右クリックした行が非選択状態の場合はその行を選択
    if (!tr.classList.contains('selected-row')) {
      Array.from(sheetBody.children).forEach(r => r.classList.remove('selected-row'));
      tr.classList.add('selected-row');
      lastSelectedRowIndex = targetRowIndex;
    }

    const selectedRowsCount = sheetBody.querySelectorAll('.selected-row').length;
    const ctxDeleteRow = document.getElementById('ctxDeleteRow');
    
    // 表示テキストを選択件数に応じて変更（例: "選択した2行を削除"）
    ctxDeleteRow.innerText = selectedRowsCount > 1 ? `選択した${selectedRowsCount}行を削除` : '行を削除';

    contextMenu.style.display = 'block';

    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let left = e.clientX;
    let top = e.clientY;

    if (left + menuWidth > windowWidth) {
      left = windowWidth - menuWidth - 4;
    }
    if (left < 0) {
      left = 0;
    }

    if (top + menuHeight > windowHeight) {
      top = windowHeight - menuHeight - 4;
    }
    if (top < 0) {
      top = 0;
    }

    contextMenu.style.left = `${left}px`;
    contextMenu.style.top = `${top}px`;
  }

  // 外部クリックでメニュー閉じ＆非セルクリックで選択解除
  document.addEventListener('click', (e) => {
    contextMenu.style.display = 'none';
    if (!e.target.closest('td')) {
      Array.from(sheetBody.children).forEach(tr => tr.classList.remove('selected-row'));
    }
  });

  // データ取得
  function getTableData() {
    return Array.from(sheetBody.children).map(tr => {
      return Array.from(tr.querySelectorAll('.sheet-cell')).map(td => td.innerText);
    });
  }

  // 行挿入
  document.getElementById('ctxInsertRowAbove').addEventListener('click', () => {
    if (targetRowIndex < 0) return;
    const data = getTableData();
    const colCount = data[0].length;
    data.splice(targetRowIndex, 0, new Array(colCount).fill(''));
    renderSheet(data);
    saveData();
  });

  document.getElementById('ctxInsertRowBelow').addEventListener('click', () => {
    if (targetRowIndex < 0) return;
    const data = getTableData();
    const colCount = data[0].length;
    data.splice(targetRowIndex + 1, 0, new Array(colCount).fill(''));
    renderSheet(data);
    saveData();
  });

  // 選択行の一括削除（全行削除を未然防止＆警告表示）
  document.getElementById('ctxDeleteRow').addEventListener('click', () => {
    const allRows = Array.from(sheetBody.children);
    const selectedRows = allRows.filter(tr => tr.classList.contains('selected-row'));

    if (selectedRows.length === 0) return;

    // 全ての行が選択されて削除されようとした場合（0行になる場合）
    if (selectedRows.length >= allRows.length) {
      alert('すべての行を削除することはできません。最低1行は残す必要があります。');
      return;
    }

    const data = getTableData();
    // 選択されていない行インデックスのデータのみ抽出
    const remainingData = data.filter((_, idx) => !allRows[idx].classList.contains('selected-row'));

    renderSheet(remainingData);
    saveData();
  });

  // 列挿入・削除
  document.getElementById('ctxInsertColLeft').addEventListener('click', () => {
    const insertIdx = targetColIndex < 0 ? 0 : targetColIndex;
    const data = getTableData();
    data.forEach(row => row.splice(insertIdx, 0, ''));
    renderSheet(data);
    saveData();
  });

  document.getElementById('ctxInsertColRight').addEventListener('click', () => {
    const data = getTableData();
    const insertIdx = targetColIndex < 0 ? data[0].length : targetColIndex + 1;
    data.forEach(row => row.splice(insertIdx, 0, ''));
    renderSheet(data);
    saveData();
  });

  document.getElementById('ctxDeleteCol').addEventListener('click', () => {
    if (targetColIndex < 0) return;
    const data = getTableData();
    if (data[0].length <= 1) return;
    data.forEach(row => row.splice(targetColIndex, 1));
    renderSheet(data);
    saveData();
  });

  // 空白セルの補完処理
  document.getElementById('ctxFillEmpty').addEventListener('click', () => {
    const fillValue = prompt('空白セルに入力する文字列を指定してください:', '-');
    if (fillValue === null) return;

    const data = getTableData();
    const updatedData = data.map(row =>
      row.map(cell => cell.trim() === '' ? fillValue : cell)
    );

    renderSheet(updatedData);
    saveData();
  });

  // データ保存
  function saveData() {
    const data = getTableData();
    chrome.storage.local.set({ sheetData: data });
  }

  // 一括クリア
  clearAllBtn.addEventListener('click', () => {
    const isConfirmed = confirm('すべての入力内容を消去して初期化しますか？\nこの操作は取り消せません。');
    if (!isConfirmed) return;

    const defaultData = [['', '', '']];
    chrome.storage.local.remove(['sheetData'], () => {
      renderSheet(defaultData);
      saveData();
    });
  });

  // CSV文字列生成ヘルパー
  function generateCsvString() {
    const data = getTableData();
    if (data.length === 0) return '';

    const header = data[0].map(cell => `"${cell.replace(/"/g, '""')}"`).join(',');

    // 2行目以降がデータ行（すべてのセルが空白の行は除外する）
    const body = data.slice(1)
      .filter(row => !row.every(cell => cell.trim() === ''))
      .map(row => {
        return row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',');
      }).join('\n');

    return [header, body].filter(Boolean).join('\n');
  }

  // MDテーブル文字列生成ヘルパー
  function generateMdTableString() {
    const data = getTableData();
    if (data.length === 0) return '';

    const escapePipe = (str) => str.replace(/\|/g, '\\|');

    // 1行目をヘッダーとして扱う
    const header = '|' + data[0].map(escapePipe).join('|') + '|';
    const separator = '|' + new Array(data[0].length).fill('---').join('|') + '|';
    
    // 2行目以降がデータ行（すべてのセルが空白の行は除外する）
    const body = data.slice(1)
      .filter(row => !row.every(cell => cell.trim() === ''))
      .map(row => {
        return '|' + row.map(escapePipe).join('|') + '|';
      }).join('\n');

    return [header, separator, body].filter(Boolean).join('\n');
  }

  // クリップボードにコピー機能
  copyCsvBtn.addEventListener('click', async () => {
    const csvString = generateCsvString();
    if (!csvString) return;

    try {
      await navigator.clipboard.writeText(csvString);
      
      copyIcon.classList.add('d-none');
      checkIcon.classList.remove('d-none');
      copyCsvBtn.classList.remove('btn-outline-secondary');
      copyCsvBtn.classList.add('btn-primary');

      setTimeout(() => {
        copyIcon.classList.remove('d-none');
        checkIcon.classList.add('d-none');
        copyCsvBtn.classList.remove('btn-primary');
        copyCsvBtn.classList.add('btn-outline-secondary');
      }, 1500);
    } catch (err) {
      console.error('クリップボードへのコピーに失敗しました:', err);
    }
  });

  // MDテーブルをクリップボードにコピー機能
  copyMdBtn.addEventListener('click', async () => {
    const mdString = generateMdTableString();
    if (!mdString) return;

    try {
      await navigator.clipboard.writeText(mdString);
      
      copyMdIcon.classList.add('d-none');
      checkMdIcon.classList.remove('d-none');
      copyMdBtn.classList.remove('btn-outline-secondary');
      copyMdBtn.classList.add('btn-info');

      setTimeout(() => {
        copyMdIcon.classList.remove('d-none');
        checkMdIcon.classList.add('d-none');
        copyMdBtn.classList.remove('btn-info');
        copyMdBtn.classList.add('btn-outline-secondary');
      }, 1500);
    } catch (err) {
      console.error('クリップボードへのコピーに失敗しました:', err);
    }
  });

  // CSV出力機能（ファイルダウンロード）
  exportCsvBtn.addEventListener('click', () => {
    const csvString = generateCsvString();
    if (!csvString) return;

    const csvContent = '\uFEFF' + csvString; // UTF-8 BOM
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const now = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `side-sheet-notes_${now}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
});