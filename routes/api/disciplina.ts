import app = require("teem");
import Disciplina = require("../../models/disciplina");
import IntegracaoMicroservices = require("../../models/integracao/microservices");
import Usuario = require("../../models/usuario");

class DisciplinaApiRoute {
	public static async buscar(req: app.Request, res: app.Response) {
		const u = await Usuario.cookie(req, res, true);
		if (!u)
			return;

		const ret = await Disciplina.buscar(parseInt(req.query["ano"] as string), parseInt(req.query["semestre"] as string), true);

		if (typeof ret === "string")
			res.status(400);

		res.json(ret);
	}

	@app.http.post()
	public static async criar(req: app.Request, res: app.Response) {
		const u = await Usuario.cookie(req, res, true);
		if (!u)
			return;

		const ret = await Disciplina.criar(req.body);

		if (typeof ret === "string")
			res.status(400);

		res.json(ret);
	}

	@app.http.post()
	public static async editar(req: app.Request, res: app.Response) {
		const u = await Usuario.cookie(req, res, true);
		if (!u)
			return;

		const erro = await Disciplina.editar(req.body);

		if (erro) {
			res.status(400).json(erro);
			return;
		}

		res.sendStatus(204);
	}

	@app.http.delete()
	public static async excluir(req: app.Request, res: app.Response) {
		const u = await Usuario.cookie(req, res, true);
		if (!u)
			return;

		const id = parseInt(req.query["id"] as string);

		if (isNaN(id)) {
			res.status(400).json("Id inválido");
			return;
		}

		const erro = await Disciplina.excluir(id);

		if (erro) {
			res.status(400).json(erro);
			return;
		}

		res.sendStatus(204);
	}

	@app.http.post()
	public static async iniciarOcorrencia(req: app.Request, res: app.Response) {
		const u = await Usuario.cookie(req, res);
		if (!u)
			return;

		const ret = await Disciplina.iniciarOcorrencia(u.id, u.admin, req.body);

		if (typeof ret === "string")
			res.status(400);

		res.json(ret);
	}

	@app.http.post()
	public static async alterarLimiteOcorrencia(req: app.Request, res: app.Response) {
		const u = await Usuario.cookie(req, res);
		if (!u)
			return;

		const ret = await Disciplina.alterarLimiteOcorrencia(u.id, u.admin, req.body);

		if (typeof ret === "string")
			res.status(400);

		res.json(ret);
	}

	@app.http.post()
	public static async proximoPasso(req: app.Request, res: app.Response) {
		const u = await Usuario.cookie(req, res);
		if (!u)
			return;

		const ret = await Disciplina.proximoPasso(u.id, u.admin, req.body);

		if (typeof ret === "string")
			res.status(400);

		res.json(ret);
	}

	public static async obterOcorrenciaConcluidaPorData(req: app.Request, res: app.Response) {
		const u = await Usuario.cookie(req, res);
		if (!u)
			return;

		const ret = await Disciplina.obterOcorrenciaConcluidaPorData(parseInt(req.query["id"] as string), parseInt(req.query["data"] as string), u.id, u.admin);

		if (typeof ret === "string")
			res.status(400);

		res.json(ret);
	}

	public static async obterParticipacoes(req: app.Request, res: app.Response) {
		const u = await Usuario.cookie(req, res);
		if (!u)
			return;

		const ret = await Disciplina.obterParticipacoes(parseInt(req.query["id"] as string), parseInt(req.query["idocorrencia"] as string), u.id, u.admin);

		if (typeof ret === "string")
			res.status(400);

		res.json(ret);
	}

	public static async obterParticipacoesZoom(req: app.Request, res: app.Response) {
		const u = await Usuario.cookie(req, res);
		if (!u)
			return;

		const disciplina = await Disciplina.usuarioTemDisciplinaObj(parseInt(req.query["id"] as string), u.id, u.admin, false);
		if (disciplina === false) {
			res.status(403).json("Não permitido");
			return;
		}

		if (!disciplina) {
			res.status(400).json("Disciplina não encontrada");
			return;
		}

		/*res.json([
			{
				duracao_aula: "02:18:00",
				nome_aluno: "GEOVANNA FREITAS_177927",
				email_aluno: "geovanna.freitas@acad.espm.br",
				duracao_presenca_aluno: 45 * 60
			},
			{
				duracao_aula: "02:18:00",
				nome_aluno: "JULIA VICENTE_144642",
				email_aluno: "julia.vicente@acad.espm.br",
				duracao_presenca_aluno: 75 * 60
			},
			{
				duracao_aula: "02:18:00",
				nome_aluno: "GEOVANNA FREITAS_177927",
				email_aluno: "geovanna.freitas@acad.espm.br",
				duracao_presenca_aluno: 25 * 60
			},
			{
				duracao_aula: "02:18:00",
				nome_aluno: "TESTE_12345678",
				email_aluno: "teste@acad.espm.br",
				duracao_presenca_aluno: 12 * 60
			}
		]);*/
		res.contentType("application/json").send(await IntegracaoMicroservices.obterParticipacoesZoom(parseInt(req.query["data"] as string), disciplina.idsistema));
	}
}

export = DisciplinaApiRoute;
