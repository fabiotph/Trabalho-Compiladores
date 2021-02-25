var Parser = require("jison").Parser;
var Lexer = require("lex");

var line = 1
var column = 1

var grammar = {
    "bnf": {
        //programa e bloco
        "<programa>" :[[ "PROGRAM IDENTIFICADOR PONTO_E_VIRGULA <bloco> PONTO", "console.log('programa')" ]],
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
        "<declaração_de_variáveis>" :[[ "<tipo_simples> <lista_de_identificadores>", "" ]],
        "<tipo_simples>": [[ "INT", "" ],
                             ["REAL", ""],
                             ["BOOLEAN", ""]],
        "<lista_de_identificadores>": [[ "IDENTIFICADOR <lista_de_identificadores_1>", "" ]],
        "<lista_de_identificadores_1>": [["VIRGULA IDENTIFICADOR <lista_de_identificadores_1>", ""],
                                         ["", ""]],
         "<parte_de_declarações_de_subrotinas>": [["<declaração_de_procedimento> PONTO_E_VIRGULA <parte_de_declarações_de_subrotinas_1>", ""]],
         "<parte_de_declarações_de_subrotinas_1>": [["<declaração_de_procedimento> PONTO_E_VIRGULA", ""],
                                                  ["", ""]],
         "<declaração_de_procedimento>": [["PROCEDURE IDENTIFICADOR PONTO_E_VIRGULA <bloco>", ""],
                                         ["PROCEDURE IDENTIFICADOR <parâmetros_formais> PONTO_E_VIRGULA <bloco>", ""]],
         "<parâmetros_formais>": [["ABR_PARENT <seção_de_parâmetros_formais> <parâmetros_formais_1> FECH_PARENT", ""]],
         "<parâmetros_formais_1>": [["", ""],
                                     ["PONTO_E_VIRGULA <seção_de_parâmetros_formais> <parâmetros_formais_1>", ""]],
         "<seção_de_parâmetros_formais>": [["VAR <lista_de_identificadores> DOIS_PONTOS <tipo_simples>", ""],
                                         ["<lista_de_identificadores> DOIS_PONTOS <tipo_simples>", ""]],
        
        //comandos
        "<comando_composto>": [["COMANDO_BEGIN <comando> <comando_composto_1> COMANDO_END", ""]],
        "<comando_composto_1>": [["", ""],
                                 ["PONTO_E_VIRGULA <comando> <comando_composto_1>", ""]],
        "<comando>": [["<atribuição>", ""],
                      ["<chamada_de_procedimento>", ""],
                      ["<comando_composto>", ""],
                      ["<comando_condicional>", ""],
                     ["<comando_repetitivo>", ""]],
        "<atribuição>": [["IDENTIFICADOR ATRIBUIÇÃO <expressão>", ""]],
         "<chamada_de_procedimento>": [["IDENTIFICADOR <chamada_de_procedimento_1>", ""]],
         "<chamada_de_procedimento_1>": [["ABR_PARENT <lista_de_expressões> FECH_PARENT", ""],
                                         ["",""]],
         "<comando_condicional>": [["COMANDO_IF <expressão> COMANDO_THEN <comando> <comando_condicional_1>", ""]],
         "<comando_condicional_1>": [["COMANDO_ELSE <comando>", ""],
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
                     ["ABR_PARENT <expressão> FECH_PARENT", ""],
                     ["OP_NOT <fator>", ""]],
        "<variável>": [["IDENTIFICADOR <variável_1>", ""]],
        "<variável_1>": [["<expressão>", ""],
                          ["", ""]],
        "<lista_de_expressões>": [["<expressão> <lista_de_expressões_1>", ""]],
        "<lista_de_expressões_1>": [["", ""],
                                    ["VIRGULA <expressão> <lista_de_expressões_1>", ""]]
    }
};

var parser = new Parser(grammar);
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
    console.log(error)
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
    this.yytext = "PROGRAM";
    _addResult("PROGRAM", "PROGRAM", line, column)
    return "PROGRAM"
})

lexer.addRule(/;/, function(lexeme){
    _addResult(lexeme, "PONTO_E_VIRGULA", line, column)
    this.yytext = lexeme;
    return "PONTO_E_VIRGULA"
})

lexer.addRule(/\./, function(lexeme){
    _addResult(lexeme, "PONTO", line, column)
    this.yytext = lexeme;
    return "PONTO"
})

lexer.addRule(/:=/, function(lexeme){
    _addResult(lexeme, "ATRIBUIÇÃO", line, column)
    this.yytext = lexeme;
    return "ATRIBUIÇÃO"
})

lexer.addRule(/\:/, function(lexeme){
    _addResult(lexeme, "DOIS_PONTOS", line, column)
    this.yytext = lexeme;
    return "DOIS_PONTOS"
})

lexer.addRule(/,/, function(lexeme){
    _addResult(lexeme, "VIRGULA", line, column)
    this.yytext = lexeme;
    return "VIRGULA"
})

lexer.addRule(/var/, function(lexeme){
    _addResult(lexeme, "VAR", line, column)
    this.yytext = lexeme;
    return "VAR"
})

lexer.addRule(/begin/, function(lexeme){
    _addResult(lexeme, "COMANDO_BEGIN", line, column)
    this.yytext = lexeme;
    return "COMANDO_BEGIN"
})

lexer.addRule(/end/, function(lexeme){
    _addResult(lexeme, "COMANDO_END", line, column)
    this.yytext = lexeme;
    return "COMANDO_END"
})

lexer.addRule(/if/, function(lexeme){
    _addResult(lexeme, "COMANDO_IF", line, column)
    this.yytext = lexeme;
    return "COMANDO_IF"
})

lexer.addRule(/then/, function(lexeme){
    _addResult(lexeme, "COMANDO_THEN", line, column)
    this.yytext = lexeme;
    return "COMANDO_THEN"
})

lexer.addRule(/else/, function(lexeme){
    _addResult(lexeme, "COMANDO_ELSE", line, column)
    this.yytext = lexeme;
    return "COMANDO_ELSE"
})

lexer.addRule(/while/, function(lexeme){
    _addResult(lexeme, "COMANDO_WHILE", line, column)
    this.yytext = lexeme;
    return "COMANDO_WHILE"
})

lexer.addRule(/do/, function(lexeme){
    _addResult(lexeme, "COMANDO_DO", line, column)
    this.yytext = lexeme;
    return "COMANDO_DO"
})

lexer.addRule(/procedure/, function(lexeme){
    _addResult(lexeme, "PROCEDURE", line, column)
    this.yytext = lexeme;
    return "PROCEDURE"
})

lexer.addRule(/and/, function(lexeme){
    _addResult(lexeme, "OP_AND", line, column)
    this.yytext = lexeme;
    return "OP_AND"
})

lexer.addRule(/or/, function(lexeme){
    _addResult(lexeme, "OP_OR", line, column)
    this.yytext = lexeme;
    return "OP_OR"
})

lexer.addRule(/div/, function(lexeme){
    _addResult(lexeme, "OP_DIV", line, column)
    this.yytext = lexeme;
    return "OP_DIV"
})

lexer.addRule(/not/, function(lexeme){
    _addResult(lexeme, "OP_NOT", line, column)
    this.yytext = lexeme;
    return "OP_NOT"
})

lexer.addRule(/\(/, function(lexeme){
    _addResult(lexeme, "ABR_PARENT", line, column)
    this.yytext = lexeme;
    return "ABR_PARENT"
})

lexer.addRule(/\)/, function(lexeme){
    _addResult(lexeme, "FECH_PARENT", line, column)
    this.yytext = lexeme;
    return "FECH_PARENT"
})

lexer.addRule(/\+/, function(lexeme){
    _addResult(lexeme, "OP_SOMA", line, column)
    this.yytext = lexeme;
    return "OP_SOMA"
})

lexer.addRule(/\-/, function(lexeme){
    _addResult(lexeme, "OP_SUBTRAÇÃO", line, column)
    this.yytext = lexeme;
    return "OP_SUBTRAÇÃO"
})

lexer.addRule(/\*/, function(lexeme){
    _addResult(lexeme, "OP_MULTIPLICAÇÃO", line, column)
    this.yytext = lexeme;
    return "OP_MULTIPLICAÇÃO"
})

lexer.addRule(/int/, function(lexeme){
    _addResult(lexeme, "INT", line, column)
    this.yytext = lexeme;
    return "INT"
})

lexer.addRule(/real/, function(lexeme){
    _addResult(lexeme, "REAL", line, column)
    this.yytext = lexeme;
    return "REAL"
})

lexer.addRule(/boolean/, function(lexeme){
    _addResult(lexeme, "BOOLEAN", line, column)
    this.yytext = lexeme;
    return "BOOLEAN"
})

lexer.addRule(/>=/, function(lexeme){
    _addResult(lexeme, "REL_MAIOR_IGUAL", line, column)
    this.yytext = lexeme;
    return "REL_MAIOR_IGUAL"
})

lexer.addRule(/<=/, function(lexeme){
    _addResult(lexeme, "REL_MENOR_IGUAL", line, column)
    this.yytext = lexeme;
    return "REL_MENOR_IGUAL"
})

lexer.addRule(/<>/, function(lexeme){
    _addResult(lexeme, "REL_DIFERENTE", line, column)
    this.yytext = lexeme;
    return "REL_DIFERENTE"
})

lexer.addRule(/</, function(lexeme){
    _addResult(lexeme, "REL_MENOR", line, column)
    this.yytext = lexeme;
    return "REL_MENOR"
})

lexer.addRule(/=/, function(lexeme){
    _addResult(lexeme, "REL_IGUAL", line, column)
    this.yytext = lexeme;
    return "REL_IGUAL"
})

lexer.addRule(/>/, function(lexeme){
    _addResult(lexeme, "REL_MAIOR", line, column)
    this.yytext = lexeme;
    return "REL_MAIOR"
})

lexer.addRule(/[0-9]+(_|[a-z]|[A-Z])((_|[a-z]|[A-Z]|[0-9]))*/, function(lexeme){
    _addResult(lexeme, "ERRO", line, column, erro="Identificador mal formado")
    this.yytext = lexeme;
    return "ERRO"
})

lexer.addRule(/(_|[a-z]|[A-Z])((_|[a-z]|[A-Z]|[0-9]))*/, function(lexeme){
    _addResult(lexeme, "IDENTIFICADOR", line, column)
    this.yytext = lexeme;
    return "IDENTIFICADOR"
})

lexer.addRule(/[0-9]{1,10}/, function(lexeme){
    _addResult(lexeme, "NUMERO", line, column)
    this.yytext = lexeme;
    return "NUMERO"
})

lexer.addRule(/[0-9]{11,}/, function(lexeme){
    _addResult(lexeme, "ERRO", line, column, error="Estouro de valor inteiro")
    this.yytext = lexeme;
    return "ERRO"
})

lexer.addRule(/[^0-9a-zA-Z\+\-\*\/\(\)\{\}\[\]\>\=\<\;\,\.\:\n\s\t]+/, function(lexeme){
    _addResult(lexeme, "ERRO", line, column, error="Lexema desconhecido")
    this.yytext = lexeme;
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
        return {lexic: result, syntatic: parser.parse(value)};
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