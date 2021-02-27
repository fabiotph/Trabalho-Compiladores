const { ipcRenderer } = require('electron')

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('#exec')
        .addEventListener('click', exec)

    document.querySelector('#load-file')
        .addEventListener('click', load_file)

    document.querySelector('#save-file')
        .addEventListener('click', save_file)

    document.querySelector('#upload')
        .addEventListener('change', read_file);
})

let exec = async () => {
    let value = document.querySelector('#input').value
    result = ipcRenderer.sendSync('execute', value)

    console.log(result)
    printResult(result.lexic)
    printResultSemantic(result.semantic)
    printResultSemanticError(result.semantic)
    if (result.syntatic === true) {
        document.querySelector('#syntatic-result').innerHTML = "A análise sintática foi concluída com sucesso"
    } else {
        document.querySelector('#syntatic-result').innerHTML = `A análise sintática foi concluída com erros. Erro na linha ${result.syntatic.loc.first_line}, token ${result.syntatic.token} inesperado`
    }
}

let changeInput = (value) => {
    document.querySelector('#input').value = value
}

let printResult = (result) => {
    _resetTable()
    for (let line of result) {
        _makeTable(line)
    }
}

let printResultSemantic = (result) => {
    _resetSemanticTable()
    for (let line of result.variables) {
        _makeSemanticTable(line)
    }

    for (let line of result.procedures) {
        _makeSemanticTable(line)
    }
}

let printResultSemanticError = (result) => {
    _resetSemanticErrorTable()
    for (let line of result.errorStack) {
        _makeSemanticErrorTable(line)
    }
}

let _resetTable = () => {
    document.querySelector('#table-body').innerHTML = ""
}

let _resetSemanticTable = () => {
    document.querySelector('#semantic-table-body').innerHTML = ""
}

let _resetSemanticErrorTable = () => {
    document.querySelector('#semantic-error-table-body').innerHTML = ""
}

let _makeSemanticErrorTable = (values) => {
    let clone = document.querySelector('#semantic-error-content-clone').cloneNode(true)
    let tableBody = document.querySelector('#semantic-error-table-body')
    clone.querySelector('#line').innerHTML = values.line
    clone.querySelector('#error').innerHTML = values.error
    tableBody.innerHTML += clone.innerHTML
}

let _makeSemanticTable = (values) => {
    let clone = document.querySelector('#semantic-content-clone').cloneNode(true)
    let tableBody = document.querySelector('#semantic-table-body')
    clone.querySelector('#name').innerHTML = values.name
    clone.querySelector('#type').innerHTML = values.type ? values.type : "-"
    clone.querySelector('#category').innerHTML = values.category ?  values.category : "procedure"
    clone.querySelector('#line').innerHTML = values.line
    clone.querySelector('#scope').innerHTML = values.level
    clone.querySelector('#used').innerHTML = values.used !== undefined ? values.used : "-"
    tableBody.innerHTML += clone.innerHTML
}

let _makeTable = (values) => {
    let clone = document.querySelector('#content-clone').cloneNode(true)
    let tableBody = document.querySelector('#table-body')
    clone.querySelector('#lexeme').innerHTML = values.lexeme
    clone.querySelector('#token').innerHTML = values.token
    clone.querySelector('#line').innerHTML = values.line
    clone.querySelector('#init-column').innerHTML = values.initColumn
    clone.querySelector('#end-column').innerHTML = values.endColumn
    clone.querySelector('#error').innerHTML = (values.error) ? values.error : "-----"
    tableBody.innerHTML += clone.innerHTML
}

let load_file = () => {
    let upload = document.querySelector('#upload')
    upload.click()
}

let read_file = async () => {
    let file = document.querySelector('#upload').files[0];
    let reader = new FileReader()
    reader.onload = (() => {
        return function (e) {
            changeInput(e.target.result)
        };
    })(file);
    reader.readAsText(file)
    document.querySelector('#upload').value = ''
}

let save_file = () => {
    download(document.querySelector('#input').value, "source.lalg", "text/plain;charset=utf-8")
}

let download = (data, filename, type) => {
    var file = new Blob([data], { type: type });
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement("a"),
            url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}