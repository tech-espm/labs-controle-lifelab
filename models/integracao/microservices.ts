import app = require("teem");
import appsettings = require("../../appsettings");
import Token = require("./token");

export = class IntegracaoMicroservices {
	private static readonly token: Token = new Token(appsettings.integracaoMicroservicesPathGerarToken, appsettings.integracaoMicroservicesTokenCredentialsJson);

	private static throwErro(message?: any) {
		if (message && (typeof message !== "string"))
			message = (message.error || message.message || message.mensagem || JSON.stringify(message));

		const err = new Error(message || "Erro");
		err["microservices"] = err.message;
		throw err;
	}

	public static async obterRA(email: string): Promise<string> {
		if (!email)
			return null;

		const tokenHeader = await IntegracaoMicroservices.token.obterHeader();
		if (!tokenHeader)
			IntegracaoMicroservices.throwErro("Erro na geração do token de acesso à integração");

		const r = await app.request.json.get(appsettings.integracaoMicroservicesPathObterRA + encodeURIComponent(email), { headers: { "Authorization": tokenHeader } });

		if (!r.success) {
			if (r.statusCode === 404)
				return "?@#$";
			IntegracaoMicroservices.throwErro(r.result);
		}

		let ra = (r.result && r.result.length && r.result[0] && r.result[0].emplid) as string;

		if (ra)
			ra = ra.trim();

		return (ra || null);
	}

	public static async obterCampusPlano(ra: string): Promise<[string, string]> {
		if (!ra)
			return null;

		const tokenHeader = await IntegracaoMicroservices.token.obterHeader();
		if (!tokenHeader)
			IntegracaoMicroservices.throwErro("Erro na geração do token de acesso à integração");

		const r = await app.request.json.get(appsettings.integracaoMicroservicesPathObterCursos + encodeURIComponent(ra), { headers: { "Authorization": tokenHeader } });

		if (!r.success)
			IntegracaoMicroservices.throwErro(r.result);

		if (r.result) {
			// Pega a partir da última (deveria ser a mais recente)
			for (let i = r.result.length - 1; i >= 0; i--) {
				const curso = r.result[i];
				let campus: string, plano: string;
				if (curso &&
					(campus = curso.campus) && (campus = campus.trim()) &&
					(plano = curso.acad_plan) && (plano = plano.trim()))
					return [campus, plano];
			}
		}

		return null;
	}

	public static async obterDisciplinas(ano: number, semestre: number): Promise<{ cataloG_NBR: string, clasS_SECTION: string, coursE_TITLE_LONG: string, courseid: string, crsE_ID: string, strm: string }[]> {
		if (!ano || !semestre)
			return null;

		const tokenHeader = await IntegracaoMicroservices.token.obterHeader();
		if (!tokenHeader)
			IntegracaoMicroservices.throwErro("Erro na geração do token de acesso à integração");

		const r = await app.request.json.get(appsettings.integracaoMicroservicesPathObterDisciplinas + (ano % 100).toString().padStart(2, "0") + semestre.toString().padStart(2, "0"), { headers: { "Authorization": tokenHeader } });

		if (!r.success)
			IntegracaoMicroservices.throwErro(r.result);

		return r.result;
	}
}
