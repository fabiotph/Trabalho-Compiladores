var Parser = require("jison").Parser;
var Lexer = require("lex");

var line = 1
var column = 1

class Scope {
    static global = new Scope() 
    static currentScope = this.global

    constructor(parent = null, type='default') {
        this.variables = {}
        this.procedures = {}
        this.childScopes = []
        this.type = type

        this.blockInitialization = new Set();

        if(parent != null) parent.childScopes.push(this)
        
        this.parent = parent
    }

    addVariable(type, name, line, category = 'var'){
        if(this.variableExists(name)) throw `variable ${name} already defined`

        this.variables[name] = {
            name,
            type,
            category,
            line,
            initialized: category == 'var' ? false : true,
            used: category == 'var' ? false : true
        }
    }

    addProcedure(name, params, line) {
        if(this.variableExists(name)) throw `variable ${name} already defined`

        this.procedures[name] = {
            line,
            params
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
        if(this.type == "block") {
            let variable = this.getVariable(name)
            if(variable != null) {
                this.blockInitialization.add(name)
                variable.used = true;
                return
            }
        }else if(this.variables[name]) {
            this.variables[name].initialized = true
            this.variables[name].used = true
            return
        }else if(this.type == 'procedure') {
            let v = this.getVariable(v)
            if(v == null) throw `variable '${name}' not defined`
        }else if(this.parent != null) return this.parent.initializeVariable(name)

        throw `variable '${name}' not defined`
    }

    assertVariableInitialized(name) {
        if(this.variables[name]) {
            if(!this.variables[name].initialized) throw `variable ${name} used before initialization`
            return true
        }else if(this.type == 'procedure') {
            return true
        }else if(this.type == 'block') {
            if(this.blockInitialization.has(name)) return true;
        }

        if(this.parent != null) return this.parent.assertVariableInitialized(name)

        throw `variable '${name}' not defined`
    }

    assertTypeCheck(name, type) {
        if(this.variables[name]) {
            if(this.variables[name].type != type) throw `expected '${this.variables[name].type}', found '${type}'`
            return
        }
        if(this.parent != null) return this.parent.assertTypeCheck(name, type)

        throw `variable '${name}' not defined`
    }

    assertProcedureTypeCheck(name, types) {
        if(this.procedures[name]) {
            let params = this.procedures[name].params

            if(params.length != types.length) throw `param count mismatch, expected ${param.length} and found ${types.length}`

            for(let i = 0; i < params.length; ++i) {
                if(params[i].type != types[i]) {
                    console.log(params[i])
                    throw `params types mismatch, expected (${params.map((v) => v.type).join(", ")}) and found (${types.join(", ")})`
                }
            }

            return
        }
        if(this.parent != null) return this.parent.assertProcedureTypeCheck(name, types)

        throw `procedure '${name}' not defined`
    }

    getVariables(level = 0) {
        let result = []
        
        for(let variable in this.variables) {
            result.push({ ...this.variables[variable], level })
        }
        
        for(let subScope of this.childScopes){
            result.push(...subScope.getVariables(level + 1))
        }

        return result
    }

    getProcedures() {
        let result = []
        for(let subScope of this.childScopes){
            result.push(...subScope.getProcedures())
        }

        for(let procedure in this.procedures) {
            result.push(this.procedures[procedure])
        }

        return result
    }


    getUnusedVariables() {
        let result = []
        for(let subScope of this.childScopes){
            result.push(...subScope.getUnusedVariables())
        }

        for(let variable in this.variables) {
            if(!this.variables[variable].used) {
                result.push(this.variables[variable])
            }
        }

        return result
    }

    static newScope(type = 'default') {
        if(this.currentScope == null) this.currentScope = this.global
        else this.currentScope = new Scope(this.currentScope, type)
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
         "<procedure>": [["PROCEDURE IDENTIFICADOR PONTO_E_VIRGULA", "newScopeProcedure(this['_$'].first_line, $2)"],
                        ["PROCEDURE IDENTIFICADOR <parâmetros_formais> PONTO_E_VIRGULA", "newScopeProcedure(this['_$'].first_line, $2)"]],
         "<declaração_de_procedimento>": [["<procedure> <bloco>", "endScope()"]],
         "<parâmetros_formais>": [["ABR_PARENT <seção_de_parâmetros_formais> <parâmetros_formais_1> FECH_PARENT", ""]],
         "<parâmetros_formais_1>": [["", ""],
                                     ["PONTO_E_VIRGULA <seção_de_parâmetros_formais> <parâmetros_formais_1>", ""]],
         "<seção_de_parâmetros_formais>": [["VAR <lista_de_identificadores> DOIS_PONTOS <tipo_simples>", "addParams($4)"],
                                         ["<lista_de_identificadores> DOIS_PONTOS <tipo_simples>", ""]],
        "<begin>": [["COMANDO_BEGIN", ""]],
        "<end>": [["COMANDO_END", ""]],
        //comandos
        "<comando_composto>": [["<begin> <comando> <comando_composto_1> <end>", ""]],
        "<comando_composto_1>": [["", ""],
                                 ["PONTO_E_VIRGULA <comando> <comando_composto_1>", ""]],
        "<comando>": [["<atribuição>", ""],
                      ["<chamada_de_procedimento>", ""],
                      ["<comando_composto>", ""],
                      ["<comando_condicional>", ""],
                     ["<comando_repetitivo>", ""]],
        "<atribuição>": [["IDENTIFICADOR ATRIBUIÇÃO <expressão>", "initializeVariable(this['_$'].first_line, $1, $3);"]],
         "<inicio_chamada_de_procedimento>": [["IDENTIFICADOR", "beginProcedureCall(this['_$'].first_line, $1)"]],
         "<fim_chamada_de_procedimento>": [["", "endProcedureCall(this['_$'].first_line)"]],
         "<chamada_de_procedimento>": [["<inicio_chamada_de_procedimento> <chamada_de_procedimento_1> <fim_chamada_de_procedimento>", ""]],
         "<chamada_de_procedimento_1>": [["ABR_PARENT <lista_de_expressões> FECH_PARENT", ""],
                                         ["",""]],
         "<if>": [["COMANDO_IF", "newScopeBlock(this['_$'].first_line)"]],
         "<else>": [["COMANDO_ELSE", "endScope(); newScopeBlock(this['_$'].first_line)"]],
         "<comando_condicional>": [["<if> <expressão> COMANDO_THEN <comando> <comando_condicional_1>", ""]],
         "<comando_condicional_1>": [["<else> <comando>", "endScope()"],
                                    ["", "endScope();"]],
         "<comando_repetitivo>": [["COMANDO_WHILE <expressão> COMANDO_DO <comando>", ""]],
        "<expressão>": [["<expressão_simples> <expressão_1>", "endExpressionList()"]],
        "<expressão_1>": [["<relação> <expressão_simples>", ""],
                         ["", ""]],
         "<relação>": [["REL_IGUAL", ""],
                         ["REL_DIFERENTE", ""],
                         ["REL_MENOR", ""],
                         ["REL_MENOR_IGUAL", ""],
                         ["REL_MAIOR_IGUAL", ""],
                         ["REL_MAIOR", ""]],
        "<expressão_simples>": [["<termo> <expressão_simples_1>", ""],
                                 ["OP_SOMA <termo> <expressão_simples_1>", "pushExpression($1)"],
                                 ["OP_SUBTRAÇÃO <termo> <expressão_simples_1>", "pushExpression($1)"]],
         "<expressão_simples_1>": [["", ""],
                                     ["OP_SOMA <termo> <expressão_simples_1>", "pushExpression($1)"],
                                     ["OP_SUBTRAÇÃO <termo> <expressão_simples_1>", "pushExpression($1)"],
                                     ["OP_OR <termo> <expressão_simples_1>", "pushExpression($1)"]],
         "<termo>":[["<fator> <termo_1>", ""]],
         "<termo_1>":[["OP_MULTIPLICAÇÃO <fator>", "pushExpression($1)"],
                         ["OP_DIV <fator>", "pushExpression($1)"],
                         ["OP_AND <fator>", "pushExpression($1)"],
                         ["", ""]],
         "<fator>": [["<variável>", ""],
                     ["NUMERO", "pushExpression($1)"],
                     ["BOOLEANO", "pushExpression($1)"],
                     ["ABR_PARENT <expressão> FECH_PARENT", ""],
                     ["OP_NOT <fator>", ""]],
        "<variável>": [["IDENTIFICADOR <variável_1>", "pushExpression($1); verifyInitialized(this['_$'].first_line, $1)"]],
        "<variável_1>": [["<expressão>", ""],
                          ["", ""]],
        "<lista_de_expressões>": [["<expressão> <lista_de_expressões_1>", ""]],
        "<lista_de_expressões_1>": [["", ""],
                                    ["VIRGULA <expressão> <lista_de_expressões_1>", ""]]
    },
    actionInclude: function () {
        let variableStack = []


        let pushVariableInStack = (name) => {
            arguments[3]['parser'].variableStack.push(name)
        }
        
        let addVariables = (line, type) => {
            try{
                while(arguments[3]['parser'].variableStack.length) {
                    arguments[3]['parser'].Scope.currentScope.addVariable(type, arguments[3]['parser'].variableStack.pop(), line)
                }
            }catch(e){
                arguments[3]['parser'].errorStack.push({
                    error: e,
                    line
                })
            }
        }

        let addParams = (type) => {
            if(!this.procedureParams) this.procedureParams = []

            while(arguments[3]['parser'].variableStack.length) {
                this.procedureParams.push({
                    name: arguments[3]['parser'].variableStack.pop(),
                    type
                })
            }
        }

        let addExpressionStack = (element) => {
            if(!this.test) this.test = []
            this.test.push(element)
        }

        let verifyInitialized = (line, name) => {
            try{
                arguments[3]['parser'].Scope.currentScope.assertVariableInitialized(name)
            }catch(e){
                arguments[3]['parser'].errorStack.push({
                    error: e,
                    line
                })
            }
        }

        let getType = (value) => {
            let type = "unknown"
            let variable = arguments[3]['parser'].Scope.currentScope.getVariable(value);

            if(value == '-' || value == '+') {
                type = "int"
            }else if(value == "true" || value == "false"){
                type = "boolean"
            }else if(!isNaN(parseInt(value))) {
                type = "int"
            }else if(!isNaN(parseFloat(value))) {
                type = "real"
            }else if(variable != null){
                type = variable.type
            }

            return type
        }

        let initializeVariable = (line, name, value) => {
            let type = "unknown"
            try{
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
                }else if(variable != null){
                    type = variable.type
                }

                arguments[3]['parser'].Scope.currentScope.assertTypeCheck(name, type)
            }catch(e) {
                arguments[3]['parser'].errorStack.push({
                    error: e,
                    line
                })
            }finally{             
                try{
                    arguments[3]['parser'].Scope.currentScope.initializeVariable(name)
                }catch(e) {
                    arguments[3]['parser'].errorStack.push({
                        error: e,
                        line
                    })
                }     
            }
        }

        let newScopeBlock = (line) => {
            arguments[3]['parser'].Scope.newScope('block')
        }

        let newScopeProcedure = (line, procedureName) => {
            try{
                if(!this.procedureParams) this.procedureParams = []

                arguments[3]['parser'].Scope.currentScope.addProcedure(procedureName, this.procedureParams, line)
                arguments[3]['parser'].Scope.newScope('procedure')
                for(param of this.procedureParams) {
                    arguments[3]['parser'].Scope.currentScope.addVariable(param.type, param.name, line, "param") 
                } 
            }catch(e) {
                arguments[3]['parser'].errorStack.push({
                    error: e,
                    line
                })
            }finally{
                this.procedureParams = []
            }
        }

        let endExpressionList = () => {
            if(this.expressionStack) this.expressionStack.push(this.expressionList)

            this.expressionList = null
        }

        let pushExpression = (expression) => {
            if(!this.expressionList) this.expressionList = []
            this.expressionList.push(expression)
        }

        let beginProcedureCall = (line, procedure) => {
            this.procedure = procedure
            this.expressionStack = []
        }

        let endProcedureCall = (line) => {
            let result = this.expressionStack
            this.expressionStack = null

            if(this.procedure == 'write' || this.procedure == 'read') return

            
            let types = []

            for(let value of result) {
                types.push(getType(value))
            }

            try{   
                arguments[3]['parser'].Scope.currentScope.assertProcedureTypeCheck(this.procedure, types)
            }catch(e) {
                arguments[3]['parser'].errorStack.push({
                    error: e,
                    line
                })
            }
        }

        let endScope = () => {
            arguments[3]['parser'].Scope.prevScope()
        }
    }
};

var parser = new Parser(grammar);
parser.variableStack = []
parser.errorStack = []
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
        parser.errorStack = []
        Scope.reset()

        let x = {lexic: result, syntatic: parser.parse(value), semantic: {
            errorStack: parser.errorStack,
            variables: Scope.global.getVariables(),
            procedures: Scope.global.getProcedures()
        }};
        for(let variable of Scope.global.getUnusedVariables()) {
            parser.errorStack.push({
                error: `variable ${variable.name} defined but not used`,
                line: variable.line
            })
        }

        return x;
    }
    catch(e){
        console.log(e)
        console.log(e.hash)
        return {lexic: result, syntatic: e.hash, semantic: {
            errorStack: parser.errorStack,
            variables: Scope.global.getVariables(),
            procedures: Scope.global.getProcedures()
        }}
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