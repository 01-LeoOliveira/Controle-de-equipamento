$(document).ready(function() {
    var associacoes = JSON.parse(localStorage.getItem('associacoes')) || [];
    var historicoAtividades = JSON.parse(localStorage.getItem('historicoAtividades')) || [];

    $('#numeroSelect, #usuarioSelect').select2({
        placeholder: 'Selecione um item',
        allowClear: true
    });

    if (isAccessMaster()) {
        $('#gerarRelatorioBtn').show();
        $('#limparHistoricoBtn').show();
    }

    $('#associarBtn').click(function() {
        var numero = $('#numeroSelect').val();
        var usuario = $('#usuarioSelect').val();

        if (numero && usuario) {
            var numeroAssociado = associacoes.some(function(item) {
                return item.numero === numero && item.usuario !== usuario;
            });

            var usuarioAssociado = associacoes.some(function(item) {
                return item.usuario === usuario && item.numero !== numero;
            });

            if (!numeroAssociado && !usuarioAssociado) {
                var token = generateToken();
                var novaAssociacao = { numero: numero, usuario: usuario, data: new Date(), token: token };
                associacoes.push(novaAssociacao);
                registrarAtividade('associação', novaAssociacao);
                atualizarListaAssociacoes();
                mostrarMensagem('Associação feita com sucesso.', 'success');
                salvarNoLocalStorage();
            } else {
                mostrarMensagem('O número de série ou usuário já está associado a outro item.', 'danger');
            }
        } else {
            mostrarMensagem('Por favor, selecione um número de série e um usuário.', 'warning');
        }
    });

    $('#gerarRelatorioBtn').click(function() {
        if (isAccessMaster()) {
            gerarRelatorio();
        } else {
            mostrarMensagem('Você não tem permissão para gerar relatórios.', 'danger');
        }
    });

    $('#limparHistoricoBtn').click(function() {
        if (isAccessMaster()) {
            limparHistorico();
        } else {
            mostrarMensagem('Você não tem permissão para limpar o histórico.', 'danger');
        }
    });

    $('#numeroSelect, #usuarioSelect').change(function(){
        filterTable();
    });

    function isAccessMaster() {
        return sessionStorage.getItem('isMaster') === 'true';
    }

    function gerarRelatorio() {
        var agora = new Date();
        var umDiaAtras = new Date(agora.getTime() - (24 * 60 * 60 * 1000));
        var relatorioTexto = `### Relatório de Atividades (Últimas 24 Horas até ${agora.toLocaleString('pt-BR')}) ###\n\n`;

        historicoAtividades.forEach(function(atividade, index) {
            var dataAtividade = new Date(atividade.data);
            if (dataAtividade >= umDiaAtras && dataAtividade <= agora) {
                relatorioTexto += `#${index + 1} - Tipo: ${atividade.tipo}, Detalhes: ${JSON.stringify(atividade.detalhes)}, Data: ${dataAtividade.toLocaleString('pt-BR')}\n`;
            }
        });

        var totalAtividades = historicoAtividades.filter(function(atividade) {
            var dataAtividade = new Date(atividade.data);
            return dataAtividade >= umDiaAtras && dataAtividade <= agora;
        }).length;

        relatorioTexto += `\nTotal de Atividades nas Últimas 24 Horas: ${totalAtividades}`;

        downloadRelatorio('relatorio_atividades.txt', relatorioTexto);
    }

    function limparHistorico() {
        var agora = new Date();
        var umDiaAtras = new Date(agora.getTime() - (24 * 60 * 60 * 1000));

        historicoAtividades = historicoAtividades.filter(function(atividade) {
            var dataAtividade = new Date(atividade.data);
            return dataAtividade < umDiaAtras;
        });

        salvarNoLocalStorage();
        atualizarListaAssociacoes();
        mostrarMensagem('Histórico das últimas 24 horas limpo com sucesso.', 'success');
    }

    function downloadRelatorio(nomeArquivo, conteudo) {
        var elementoLink = document.createElement('a');
        elementoLink.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(conteudo));
        elementoLink.setAttribute('download', nomeArquivo);

        elementoLink.style.display = 'none';
        document.body.appendChild(elementoLink);

        elementoLink.click();

        document.body.removeChild(elementoLink);
    }

    function registrarAtividade(tipo, detalhes) {
        var novaAtividade = { tipo: tipo, detalhes: detalhes, data: new Date() };
        historicoAtividades.push(novaAtividade);
        salvarNoLocalStorage();
    }

    function salvarNoLocalStorage() {
        localStorage.setItem('associacoes', JSON.stringify(associacoes));
        localStorage.setItem('historicoAtividades', JSON.stringify(historicoAtividades));
    }

    function atualizarListaAssociacoes() {
        $('#associacoesList').empty();

        associacoes.forEach(function(item) {
            var li = $('<li>').text(`Número: ${item.numero}, Usuário: ${item.usuario}`);
            var btnRemover = $('<button>').addClass('btn btn-sm btn-danger ml-2').text('Remover');
            btnRemover.click(function() {
                if (isAccessMaster()) {
                    removerAssociacao(item.numero, item.usuario);
                } else {
                    var token = prompt('Por favor, insira o token para remover esta associação:');
                    if (token === item.token) {
                        removerAssociacao(item.numero, item.usuario);
                    } else {
                        mostrarMensagem('Token inválido.', 'danger');
                    }
                }
            });

            // Adiciona o botão "TOKEN"
            var btnToken = $('<button>').addClass('btn btn-sm btn-info ml-2').text('TOKEN');
            btnToken.click(function() {
                gerarQRCode(item.token, true); // true para imprimir
            });

            li.append(btnRemover);
            li.append(btnToken);

            // Adiciona a classe .associado se já estiver associado
            if (associacaoJaExistente(item.numero, item.usuario)) {
                li.addClass('associado');
            }

            $('#associacoesList').append(li);
        });

        filterTable();
    }

    function removerAssociacao(numero, usuario) {
        associacoes = associacoes.filter(function(item) {
            return !(item.numero === numero && item.usuario === usuario);
        });

        registrarAtividade('remoção', { numero: numero, usuario: usuario });
        atualizarListaAssociacoes();
        mostrarMensagem('Associação removida com sucesso.', 'success');
    }

    function filterTable() {
        var selectedNumero = $('#numeroSelect').val().toLowerCase();
        var selectedUsuario = $('#usuarioSelect').val().toLowerCase();
        
        $('table.table-striped tbody tr').each(function(){
            var numero = $(this).find('td:eq(0)').text().toLowerCase();
            var usuario = $(this).find('td:eq(1)').text().toLowerCase();
            
            if ((selectedNumero === "" || numero.includes(selectedNumero)) &&
                (selectedUsuario === "" || usuario.includes(selectedUsuario))) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    }

    function mostrarMensagem(mensagem, tipo) {
        $('.alert').remove();

        var alertClass = tipo === 'success' 
        ? 'alert-success' 
        : (tipo === 'danger' 
        ? 'alert-danger' 
        : 'alert-warning');
        
        var alertElement = $('<div class="alert ' + alertClass + ' mt-2" role="alert">').text(mensagem);

        $('.message-container').prepend(alertElement);

        setTimeout(function() {
            alertElement.remove();
        }, 4000);
    }

    function generateToken() {
        return Math.random().toString(36).substr(2, 8);
    }

    function gerarQRCode(token, imprimir) {
        var qrcodeContainer = document.getElementById('qrcodeContainer');
        qrcodeContainer.innerHTML = ""; // Limpa qualquer QR code anterior

        // Cria o QR code
        var qrcode = new QRCode(qrcodeContainer, {
            text: token,
            width: 128,
            height: 128
        });

        // Se imprimir for true, abre a janela de impressão
        if (imprimir) {
            setTimeout(function() { // Adiciona um pequeno atraso para garantir que o QR code seja gerado
                var printWindow = window.open('', '', 'width=400,height=400');
                printWindow.document.write('<html><head><title>Imprimir QR Code</title></head><body>');
                printWindow.document.write('<div style="text-align: center;">' + qrcodeContainer.innerHTML + '</div>');
                printWindow.document.write('<script type="text/javascript">window.onload = function() { window.print(); window.close(); }</script>');
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.focus();
            }, 500); // 500ms de atraso
        }
    }

    function associacaoJaExistente(numero, usuario) {
        return associacoes.some(function(item) {
            return item.numero === numero && item.usuario === usuario;
        });
    }

    atualizarListaAssociacoes();
});

