var Parser = require("jison").Parser;
var Lexer = require("lex");

var line = 1
var column = 1

class Scope {
    static global = new Scope() 
    static currentScope = this.global

    constructor(parent = null) {
        this.variables = {}
        this.procedures = {}
        
        this.parent = parent
    }

    addVariable(type, name, line, category = 'var'){
        if(this.variableExists(name)) throw `variable ${name} already defined`

        this.variables[name] = {
            name,
            type,
            category,
            line,
            initialized: false
        }
    }

    variableExists(name, checkParent = false){
        if(this.variables[name] != undefined) return true;

        if(checkParent && this.parent != null) return this.parent.variableExists(name, checkParent)
        return false
    }

    getVariable(name) {
        if(this.variables[name] != undefined) return this.variables[name];

        if(this.parent != null) return this.parent.getVariable(name)
        return null
    }

    getUnitializedVariables() {
        let result = []

        for(variable of this.variables) {
            if(!variable.initialized) result.push(variable)
        }

        return result
    }

    initializeVariable(name) {
        if(this.variables[name]) {
            this.variables[name].initialized = true
            return
        }
        else if(this.parent != null) return this.parent.initializeVariable(name)

        throw `variable '${name}' not defined`
    }

    assertVariableInitialized(name) {
        if(this.variables[name]) {
            if(!this.variables[name].initialized) throw `variable ${name} used before initialization`
            return true
        }
        if(this.parent != null) return this.parent.assertVariableInitialized(name, type)

        throw `variable '${name}' not defined`
    }

    assertTypeCheck(name, type) {
        if(this.variables[name]) {
            if(this.variables[name].type != type) throw `expected '${this.variables[name].type}', found '${type}'`
            console.log(type)
            return
        }
        if(this.parent != null) return this.parent.assertTypeCheck(name, type)

        throw `variable '${name}' not defined`
    }

    static newScope() {
        if(this.currentScope == null) this.currentScope = this.global
        else this.currentScope = new Scope(this.currentScope)
    }

    static prevScope() {
        if(this.currentScope.parent) this.currentScope = this.currentScope.parent
    }

    static reset() {
        this.global = new Scope() 
        this.currentScope = this.global
    }
}


var grammar = {
    bnf: {
        //programa e bloco
        "<programa>" :[[ "PROGRAM IDENTIFICADOR PONTO_E_VIRGULA <bloco> PONTO", "" ]],
        "<bloco>" : [[ "<parte_de_declarações_de_variáveis> <bloco_1>", "" ],
                    [ "<parte_de_declarações_de_subrotinas> <comando_composto>", "" ],
                    [ "<comando_composto>", "" ]],
        "<bloco_1>":[[ "<parte_de_declarações_de_subrotinas> <comando_composto>", "" ],
                        ["<comando_composto>", ""],
                        ["", ""]],
        //declarações
        "<parte_de_declarações_de_variáveis>" :[[ "<declaração_de_variáveis> PONTO_E_VIRGULA <parte_de_declarações_de_variáveis_1>", "" ]],
        "<parte_de_declarações_de_variáveis_1>" :[[ "<declaração_de_variáveis> PONTO_E_VIRGULA <parte_de_declarações_de_variáveis_1>", "" ],
                                                     ["", ""]],
        "<declaração_de_variáveis>" :[[ "<tipo_simples> <lista_de_identificadores>", `addVariables(this['_$'].first_line, $1)` ]],
        "<tipo_simples>": [[ "INT", "" ],
                             ["REAL", ""],
                             ["BOOLEAN", ""]],
        "<lista_de_identificadores>": [[ "IDENTIFICADOR <lista_de_identificadores_1>", "pushVariableInStack($1)" ]],
        "<lista_de_identificadores_1>": [["VIRGULA IDENTIFICADOR <lista_de_identificadores_1>", "pushVariableInStack($2)"],
                                         ["", ""]],
         "<parte_de_declarações_de_subrotinas>": [["<declaração_de_procedimento> PONTO_E_VIRGULA <parte_de_declarações_de_subrotinas_1>", ""]],
         "<parte_de_declarações_de_subrotinas_1>": [["<declaração_de_procedimento> PONTO_E_VIRGULA", ""],
                                                  ["", ""]],
         "<procedure>": [["PROCEDURE", "newScope()"]],
         "<declaração_de_procedimento>": [["<procedure> IDENTIFICADOR PONTO_E_VIRGULA <bloco>", ""],
                                         ["<procedure> IDENTIFICADOR <parâmetros_formais> PONTO_E_VIRGULA <bloco>", ""]],
         "<parâmetros_formais>": [["ABR_PARENT <seção_de_parâmetros_formais> <parâmetros_formais_1> FECH_PARENT", ""]],
         "<parâmetros_formais_1>": [["", ""],
                                     ["PONTO_E_VIRGULA <seção_de_parâmetros_formais> <parâmetros_formais_1>", ""]],
         "<seção_de_parâmetros_formais>": [["VAR <lista_de_identificadores> DOIS_PONTOS <tipo_simples>", ""],
                                         ["<lista_de_identificadores> DOIS_PONTOS <tipo_simples>", ""]],
        "<begin>": [["COMANDO_BEGIN", ""]],
        "<end>": [["COMANDO_END", "endScope()"]],
        //comandos
        "<comando_composto>": [["<begin> <comando> <comando_composto_1> <end>", ""]],
        "<comando_composto_1>": [["", ""],
                                 ["PONTO_E_VIRGULA <comando> <comando_composto_1>", ""]],
        "<comando>": [["<atribuição>", ""],
                      ["<chamada_de_procedimento>", ""],
                      ["<comando_composto>", ""],
                      ["<comando_condicional>", ""],
                     ["<comando_repetitivo>", ""]],
        "<atribuição>": [["IDENTIFICADOR ATRIBUIÇÃO <expressão>", "initializeVariable($1, $3);"]],
         "<chamada_de_procedimento>": [["IDENTIFICADOR <chamada_de_procedimento_1>", ""]],
         "<chamada_de_procedimento_1>": [["ABR_PARENT <lista_de_expressões> FECH_PARENT", ""],
                                         ["",""]],
         "<comando_condicional>": [["COMANDO_IF <expressão> COMANDO_THEN <comando> <comando_condicional_1>", ""]],
         "<comando_condicional_1>": [["COMANDO_ELSE <comando>", "console.log('ELSE')"],
                                    ["", ""]],
         "<comando_repetitivo>": [["COMANDO_WHILE <expressão> COMANDO_DO <comando>", ""]],
        "<expressão>": [["<expressão_simples> <expressão_1>", ""]],
        "<expressão_1>": [["<relação> <expressão_simples>", ""],
                         ["", ""]],
         "<relação>": [["REL_IGUAL", ""],
                         ["REL_DIFERENTE", ""],
                         ["REL_MENOR", ""],
                         ["REL_MENOR_IGUAL", ""],
                         ["REL_MAIOR_IGUAL", ""],
                         ["REL_MAIOR", ""]],
        "<expressão_simples>": [["<termo> <expressão_simples_1>", ""],
                                 ["OP_SOMA <termo> <expressão_simples_1>", ""],
                                 ["OP_SUBTRAÇÃO <termo> <expressão_simples_1>", ""]],
         "<expressão_simples_1>": [["", ""],
                                     ["OP_SOMA <termo> <expressão_simples_1>", ""],
                                     ["OP_SUBTRAÇÃO <termo> <expressão_simples_1>", ""],
                                     ["OP_OR <termo> <expressão_simples_1>", ""]],
         "<termo>":[["<fator> <termo_1>", ""]],
         "<termo_1>":[["OP_MULTIPLICAÇÃO <fator>", ""],
                         ["OP_DIV <fator>", ""],
                         ["OP_AND <fator>", ""],
                         ["", ""]],
         "<fator>": [["<variável>", ""],
                     ["NUMERO", ""],
                     ["BOOLEANO", ""],
                     ["ABR_PARENT <expressão> FECH_PARENT", ""],
                     ["OP_NOT <fator>", ""]],
        "<variável>": [["IDENTIFICADOR <variável_1>", ""]],
        "<variável_1>": [["<expressão>", ""],
                          ["", ""]],
        "<lista_de_expressões>": [["<expressão> <lista_de_expressões_1>", ""]],
        "<lista_de_expressões_1>": [["", ""],
                                    ["VIRGULA <expressão> <lista_de_expressões_1>", ""]]
    },
    actionInclude: function () {
        let variableStack = []

        function test(val) {
            console.log(val)
        }

        let pushVariableInStack = (name) => {
            arguments[3]['parser'].variableStack.push(name)
        }
        
        let addVariables = (line, type) => {
            while(arguments[3]['parser'].variableStack.length) {
                arguments[3]['parser'].Scope.currentScope.addVariable(type, arguments[3]['parser'].variableStack.pop(), line)
            }
        }

        let addExpressionStack = (element) => {
            if(!this.test) this.test = []
            this.test.push(element)
        }

        let initializeVariable = (name, value) => {
            let type = "unknown"
            let v = arguments[3]['parser'].Scope.currentScope.getVariable(name)
            let variable = arguments[3]['parser'].Scope.currentScope.getVariable(value);
            if(name != null && value == '-' || value == '+') {
                type = v.type
            }else if(value == "true" || value == "false"){
                type = "boolean"
            }else if(!isNaN(parseInt(value))) {
                type = "int"
            }else if(!isNaN(parseFloat(value))) {
                type = "real"
            }else if(arguments[3]['parser'].Scope.currentScope.assertVariableInitialized(value)){
                console.log(variable)
                type = variable.type
            }
            
            arguments[3]['parser'].Scope.currentScope.assertTypeCheck(name, type)
            arguments[3]['parser'].Scope.currentScope.initializeVariable(name)
        }

        let newScope = () => {
            console.log("BEGIN")
            arguments[3]['parser'].Scope.newScope()
        }

        let endScope = () => {
            arguments[3]['parser'].Scope.prevScope()
        }
    }
};

var parser = new Parser(grammar);
parser.variableStack = []
parser.Scope = Scope
var lexer = parser.lexer = new Lexer(function (char) {
    console.log("err")
});


// lexer.addRule(/\s+/, function () {});

// lexer.addRule(/[0-9]+(?:\.[0-9]+)?\b/, function (lexeme) {
//     this.yytext = lexeme;
//     console.log()
//     return "NUMBER";
// });
var result = []
let _addResult = (lexeme, token, line, currentColumn, error = null) => {
    let initColumn = currentColumn
    column += lexeme.length - 1
    //console.log(error)
    result.push({
        "lexeme": lexeme,
        "token": token,
        "line": line,
        "initColumn": initColumn,
        "endColumn": column++,
        "error": error
    })
}

lexer.addRule(/ /, () => { ++column; return undefined })
lexer.addRule(/\n/, () => { ++line; column = 1; return undefined })
lexer.addRule(/\t/, () => { column += 7; return undefined })

lexer.addRule(/\{(\w|[^\}\w])*$/i, (lexeme) => _addResult(lexeme, "ERRO", line, column, error="Comentário não finalizado"))
lexer.addRule(/\/\/([^\n])*/i, (lexeme) => {column += lexeme.length - 1})
lexer.addRule(/\{(\w|\W)*\}/i, (lexeme) => {column += lexeme.length - 1})

lexer.addRule(/program/, function(lexeme) {
    this.yytext = "PROGRAMA";
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol: "PROGRAM"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    console.log(this.yyloc)


    _addResult("PROGRAM", "PROGRAM", line, column)
    return "PROGRAM"
})


lexer.addRule(/;/, function(lexeme){
    _addResult(lexeme, "PONTO_E_VIRGULA", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol: "PONTO_E_VIRGULA"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;


    return "PONTO_E_VIRGULA"
})

lexer.addRule(/\./, function(lexeme){
    _addResult(lexeme, "PONTO", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol: "PONTO"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "PONTO"
})

lexer.addRule(/:=/, function(lexeme){
    _addResult(lexeme, "ATRIBUIÇÃO", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol:"ATRIBUIÇÃO"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "ATRIBUIÇÃO"
})

lexer.addRule(/\:/, function(lexeme){
    _addResult(lexeme, "DOIS_PONTOS", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "DOIS_PONTOS"
})

lexer.addRule(/,/, function(lexeme){
    _addResult(lexeme, "VIRGULA", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "VIRGULA"
})

lexer.addRule(/var/, function(lexeme){
    _addResult(lexeme, "VAR", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "VAR"
})

lexer.addRule(/begin/, function(lexeme){
    _addResult(lexeme, "COMANDO_BEGIN", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "COMANDO_BEGIN"
})

lexer.addRule(/end/, function(lexeme){
    _addResult(lexeme, "COMANDO_END", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "COMANDO_END"
})

lexer.addRule(/if/, function(lexeme){
    _addResult(lexeme, "COMANDO_IF", line, column)

    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "COMANDO_IF"
})

lexer.addRule(/then/, function(lexeme){
    _addResult(lexeme, "COMANDO_THEN", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "COMANDO_THEN"
})

lexer.addRule(/else/, function(lexeme){
    _addResult(lexeme, "COMANDO_ELSE", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "COMANDO_ELSE"
})

lexer.addRule(/while/, function(lexeme){
    _addResult(lexeme, "COMANDO_WHILE", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "COMANDO_WHILE"
})

lexer.addRule(/do/, function(lexeme){
    _addResult(lexeme, "COMANDO_DO", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "COMANDO_DO"
})

lexer.addRule(/procedure/, function(lexeme){
    _addResult(lexeme, "PROCEDURE", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "PROCEDURE"
})

lexer.addRule(/and/, function(lexeme){
    _addResult(lexeme, "OP_AND", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol:"OP_AND"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "OP_AND"
})

lexer.addRule(/or/, function(lexeme){
    _addResult(lexeme, "OP_OR", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol:"OP_OR"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "OP_OR"
})

lexer.addRule(/div/, function(lexeme){
    _addResult(lexeme, "OP_DIV", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol:"OP_DIV"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "OP_DIV"
})

lexer.addRule(/not/, function(lexeme){
    _addResult(lexeme, "OP_NOT", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol:"OP_NOT"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "OP_NOT"
})

lexer.addRule(/\(/, function(lexeme){
    _addResult(lexeme, "ABR_PARENT", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol: "ABR_PARENT"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "ABR_PARENT"
})

lexer.addRule(/\)/, function(lexeme){
    _addResult(lexeme, "FECH_PARENT", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol: "FECH_PARENT"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "FECH_PARENT"
})

lexer.addRule(/\+/, function(lexeme){
    _addResult(lexeme, "OP_SOMA", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol:"OP_SOMA"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "OP_SOMA"
})

lexer.addRule(/\-/, function(lexeme){
    _addResult(lexeme, "OP_SUBTRAÇÃO", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol:"OP_SUBTRAÇÃO"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "OP_SUBTRAÇÃO"
})

lexer.addRule(/\*/, function(lexeme){
    _addResult(lexeme, "OP_MULTIPLICAÇÃO", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol:"OP_MULTIPLICAÇÃO"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "OP_MULTIPLICAÇÃO"
})

lexer.addRule(/int/, function(lexeme){
    _addResult(lexeme, "INT", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol: "INT"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "INT"
})

lexer.addRule(/real/, function(lexeme){
    _addResult(lexeme, "REAL", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol: "REAL"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "REAL"
})

lexer.addRule(/boolean/, function(lexeme){
    _addResult(lexeme, "BOOLEAN", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol: "BOOLEAN"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "BOOLEAN"
})

lexer.addRule(/>=/, function(lexeme){
    _addResult(lexeme, "REL_MAIOR_IGUAL", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol: "REL_MAIOR_IGUAL"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "REL_MAIOR_IGUAL"
})

lexer.addRule(/<=/, function(lexeme){
    _addResult(lexeme, "REL_MENOR_IGUAL", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol: "REL_MENOR_IGUAL"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "REL_MENOR_IGUAL"
})

lexer.addRule(/<>/, function(lexeme){
    _addResult(lexeme, "REL_DIFERENTE", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol: "REL_DIFERENTE"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "REL_DIFERENTE"
})

lexer.addRule(/</, function(lexeme){
    _addResult(lexeme, "REL_MENOR", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol: "REL_MENOR"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "REL_MENOR"
})

lexer.addRule(/=/, function(lexeme){
    _addResult(lexeme, "REL_IGUAL", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol: "REL_IGUAL"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "REL_IGUAL"
})

lexer.addRule(/>/, function(lexeme){
    _addResult(lexeme, "REL_MAIOR", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol: "REL_MAIOR"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "REL_MAIOR"
})

lexer.addRule(/[0-9]+(_|[a-z]|[A-Z])((_|[a-z]|[A-Z]|[0-9]))*/, function(lexeme){
    _addResult(lexeme, "ERRO", line, column, erro="Identificador mal formado")
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "ERRO"
})


lexer.addRule(/(true|false)/, function(lexeme){
    _addResult(lexeme, "BOOLEANO", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol: "BOOLEANO"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "BOOLEANO"
})

lexer.addRule(/(_|[a-z]|[A-Z])((_|[a-z]|[A-Z]|[0-9]))*/, function(lexeme){
    _addResult(lexeme, "IDENTIFICADOR", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "IDENTIFICADOR"
})

lexer.addRule(/[0-9]{1,10}/, function(lexeme){
    _addResult(lexeme, "NUMERO", line, column)
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length,
        symbol: "NUMERO"
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "NUMERO"
})

lexer.addRule(/[0-9]{11,}/, function(lexeme){
    _addResult(lexeme, "ERRO", line, column, error="Estouro de valor inteiro")
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "ERRO"
})

lexer.addRule(/[^0-9a-zA-Z\+\-\*\/\(\)\{\}\[\]\>\=\<\;\,\.\:\n\s\t]+/, function(lexeme){
    _addResult(lexeme, "ERRO", line, column, error="Lexema desconhecido")
    this.yytext = lexeme;
    this.yyloc = {
        first_column: column,
        first_line: line,
        last_line: line,
        last_column: column + lexeme.length
    };
    this.yylloc = this.yyloc;
    this.yylineno = this.yyloc.line;
    return "ERRO"
})

function analise_sintatica(value){
    lexic = result
    result = []
    line = 0
    column = 0
    try{
        //console.log(value)
        //console.log(parser)
        parser.variableStack = []
        Scope.reset()
        let x = {lexic: result, syntatic: parser.parse(value)};
        console.log(Scope.global)
        return x;
    }
    catch(e){
        console.log(e)
        console.log(e.hash)
        return {lexic: result, syntatic: e.hash}
    }
}

// analise_sintatica(`program correto;
// {int a, b, c;}
// boolean d, e, f;
// int a, b, c;
// boolean d, e, f;
// begin
//     a:=1;
//     if (a>=1) then
//         a:=12
// end.`)

module.exports = {
    analise_sintatica
};

//analise_sintatica(`program correto;
// int a, b, c;
// boolean d, e, f;

// procedure proc(var a1 : int);
// int aa, b, c;
// boolean d, e, f;
// begin
// 	aaa:=1;
// 	if (a<1) then
// 		aa:=12
// end;


// begin
// 	a:=-2;
// 	b:=10;
// 	c:=11;
// 	a:=b+c;
// 	d:=true;
// 	e:=false;
// 	f:=true;
// 	read(a);
// 	write(b);
// 	if (d) then
// 	begin
// 		a:=+20;
// 		b:=10*c;
// 		c:=a div b
// 	end
// 	else
// 	begin
// 		if (a<1) then
// 			a:=1
// 		else
// 			b:=2
// 	end;
// 	proc(a);
// 	proc(b);
// 	while (a>1) do
// 	begin
// 		if (b>10) then
// 			b:=2;
// 		a:=a-1
// 	end
// end.`)