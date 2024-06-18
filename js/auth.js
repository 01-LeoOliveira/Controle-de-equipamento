$(document).ready(function() {
    // Verifica se o usuário já está logado como master
    if (sessionStorage.getItem('isMaster') === 'true') {
        // Redireciona para o index.html se já estiver logado
        window.location.href = 'index.html';
    }

    // Evento de clique no botão de login
    $('#loginBtn').click(function() {
        var username = $('#username').val();
        var password = $('#password').val();

        // Verifica se o usuário e senha correspondem ao acesso master
        if (username === 'master' && password === '@dm!n!23') {
            // Define a flag de acesso master na sessionStorage
            sessionStorage.setItem('isMaster', 'true');
            // Redireciona para o index.html após login bem-sucedido
            window.location.href = 'index.html';
        } else {
            // Exibe mensagem de erro se o login falhar
            $('#message').text('Usuário ou senha incorretos').addClass('alert alert-danger');
        }
    });
});
