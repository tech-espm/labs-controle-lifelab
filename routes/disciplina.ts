﻿import app = require("teem");
import appsettings = require("../appsettings");
import Disciplina = require("../models/disciplina");
import IntegracaoMicroservices = require("../models/integracao/microservices");
import Usuario = require("../models/usuario");
import DataUtil = require("../utils/dataUtil");

class DisciplinaRoute {
	public static async criar(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u || !u.admin) {
			res.redirect(app.root + "/acesso");
		} else {
			const hoje = new Date();
			let ano = hoje.getFullYear();
			let mes = hoje.getMonth() + 1;
			let semestre = 1;
			if (mes >= 6 && mes <= 11)
				semestre = 2;
			else if (mes === 12)
				ano++;

			res.render("disciplina/criar", {
				titulo: "Criar Disciplina",
				textoSubmit: "Criar",
				usuario: u,
				item: null,
				ano,
				semestre,
				disciplinas: await Disciplina.buscar(ano, semestre, true)
			});
		}
	}

	public static async editar(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u || !u.admin) {
			res.redirect(app.root + "/acesso");
		} else {
			let id = parseInt(req.query["id"] as string);
			let item: Disciplina = null;
			if (isNaN(id) || !(item = await Disciplina.obter(id)))
				res.render("index/nao-encontrado", {
					layout: "layout-sem-form",
					usuario: u
				});
			else
				res.render("disciplina/editar", {
					titulo: "Editar Disciplina",
					usuario: u,
					item,
					professores: await Usuario.listarCombo()
				});
		}
	}

	public static async listar(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u || !u.admin)
			res.redirect(app.root + "/acesso");
		else
			res.render("disciplina/listar", {
				layout: "layout-tabela",
				titulo: "Gerenciar Disciplinas",
				datatables: true,
				usuario: u,
				lista: await Disciplina.listar()
			});
	}

	public static async index(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u) {
			res.redirect(app.root + "/acesso");
		} else {
			let ano = parseInt(req.query["p"] as string),
				semestre: number,
				anoAtual = DataUtil.converterISOParaNumero(DataUtil.horarioDeBrasiliaISO()),
				semestreAtual = (((((anoAtual / 100) | 0) % 100) < 7) ? 1 : 2);

			anoAtual = (anoAtual / 10000) | 0;

			if (!ano) {
				ano = anoAtual;
				semestre = semestreAtual;
			} else {
				semestre = ano % 10;
				ano = (ano / 10) | 0;
			}

			res.render("disciplina/index", {
				layout: "layout-sem-form",
				titulo: "Minhas Disciplinas",
				datatables: true,
				usuario: u,
				anoAtual,
				semestreAtual,
				anoEscolhido: ano,
				semestreEscolhido: semestre,
				lista: await Disciplina.listarDeUsuario(u.id, ano, semestre)
			});
		}
	}

	public static async verificacao(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u) {
			res.redirect(app.root + "/acesso");
		} else {
			let id = parseInt(req.query["id"] as string);
			let disciplina: any, ocorrencia: any;
			if (isNaN(id))
				res.render("index/nao-encontrado", {
					layout: "layout-sem-form",
					usuario: u
				});
			else if (!(disciplina = await Disciplina.usuarioTemDisciplinaObj(id, u.id, u.admin, true)) || (ocorrencia = await Disciplina.obterOcorrenciaNaoConcluida(id, u.id, u.admin)) === false)
				res.redirect(app.root + "/acesso");
			else
				res.render("disciplina/verificacao", {
					titulo: "Controle de QR da Disciplina",
					layout: "layout-card",
					datepicker: true,
					usuario: u,
					disciplina,
					ocorrencia
				});
		}
	}

	@app.route.methodName("qr/:estado/:limite/:tokenQR/:eletiva?")
	public static async qr(req: app.Request, res: app.Response) {
		const eletiva = parseInt(req.params["eletiva"] as string) || 0;

		res.render("disciplina/qr", {
			layout: "layout-externo",
			titulo: "Código QR",
			clipboard: true,
			estado: parseInt(req.params["estado"] as string),
			limite: parseInt(req.params["limite"] as string),
			link: appsettings.urlPresenca + encodeURIComponent(req.params["tokenQR"] as string) + (eletiva ? "/1" : "/0")
		});
	}

	public static async presenca(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u) {
			res.redirect(app.root + "/acesso");
		} else {
			let id = parseInt(req.query["id"] as string);
			let disciplina: any;
			let estudantesDisciplinaJSON: string;
			if (isNaN(id))
				res.render("index/nao-encontrado", {
					layout: "layout-sem-form",
					usuario: u
				});
			else if (!(disciplina = await Disciplina.usuarioTemDisciplinaObj(id, u.id, u.admin, false)))
				res.redirect(app.root + "/acesso");
			else if (!(estudantesDisciplinaJSON = await IntegracaoMicroservices.obterEstudantesDisciplina(disciplina.idcurso, disciplina.ano, disciplina.semestre)))
				res.render("index/erro", {
					layout: "layout-externo",
					mensagem: "Não foram encontradas matrículas na disciplina"
				});
			else
				res.render("disciplina/presenca", {
					titulo: "Presenças da Disciplina",
					layout: "layout-card",
					datepicker: true,
					datatables: true,
					xlsx: true,
					usuario: u,
					disciplina,
					estudantesDisciplinaJSON,
					emailProfessores: await Disciplina.obterEmailDosProfessores(disciplina.id)
				});
		}
	}

	public static async presencaSemestral(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u) {
			res.redirect(app.root + "/acesso");
		} else {
			let id = parseInt(req.query["id"] as string);
			let disciplina: any;
			let ocorrencias: any;
			let estudantesDisciplinaJSON: string;
			if (isNaN(id))
				res.render("index/nao-encontrado", {
					layout: "layout-sem-form",
					usuario: u
				});
			else if (!(disciplina = await Disciplina.usuarioTemDisciplinaObj(id, u.id, u.admin, false)))
				res.redirect(app.root + "/acesso");
			else if (typeof (ocorrencias = await Disciplina.obterTodasOcorrenciasConcluidas(id, u.id, u.admin)) === "string")
				res.render("index/erro", {
					layout: "layout-externo",
					mensagem: ocorrencias
				});
			else if (!(estudantesDisciplinaJSON = await IntegracaoMicroservices.obterEstudantesDisciplina(disciplina.idcurso, disciplina.ano, disciplina.semestre)))
				res.render("index/erro", {
					layout: "layout-externo",
					mensagem: "Não foram encontradas matrículas na disciplina"
				});
			else
				res.render("disciplina/presenca-semestral", {
					titulo: "Presença Semestral da Disciplina",
					layout: "layout-card",
					datatables: true,
					xlsx: true,
					usuario: u,
					disciplina,
					ocorrencias,
					estudantesDisciplinaJSON,
					emailProfessores: await Disciplina.obterEmailDosProfessores(disciplina.id)
				});
		}
	}

	public static async historico(req: app.Request, res: app.Response) {
		let u = await Usuario.cookie(req);
		if (!u) {
			res.redirect(app.root + "/acesso");
		} else {
			let id = parseInt(req.query["id"] as string);
			let disciplina: any;
			if (isNaN(id))
				res.render("index/nao-encontrado", {
					layout: "layout-sem-form",
					usuario: u
				});
			else if (!(disciplina = await Disciplina.usuarioTemDisciplinaObj(id, u.id, u.admin, false)))
				res.redirect(app.root + "/acesso");
			else
				res.render("disciplina/historico", {
					titulo: "Histórico da Disciplina",
					layout: "layout-card",
					datepicker: true,
					datatables: true,
					usuario: u,
					disciplina,
					emailProfessores: await Disciplina.obterEmailDosProfessores(disciplina.id)
				});
		}
	}
}

export = DisciplinaRoute;
