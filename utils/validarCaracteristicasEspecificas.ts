import app = require("teem");

export = async function validarCaracteristicasEspecificas(sql: app.Sql, nome: string, separador: string, caracteristicas: string | null, validadorValor?: (valor: string) => boolean): Promise<string | string[] | null> {
	const alertas: string[] = [];

	if (caracteristicas) {
		const id: number | null = await sql.scalar("select id from mdl_customfield_field where shortname = 'rsttp'");
		if (!id)
			return "Campo de código do curso não encontrado";

		const linhas = caracteristicas.split(separador);
		for (let i = 0; i < linhas.length; i++) {
			if (!linhas[i].trim())
				return nome + " com erro: [vazio]";

			let a: string, b: string;
			const s = linhas[i].indexOf(":");
			if (s <= 0 || s >= linhas[i].length - 1 || !(a = linhas[i].substring(0, s).trim()) || !(b = linhas[i].substring(s + 1).trim()))
				return nome + " com erro: " + linhas[i];

			if (a.indexOf(":") >= 0 || a.indexOf(";") >= 0 || b.indexOf(":") >= 0 || b.indexOf(";") >= 0)
				return nome + " não pode conter os caracteres : e ;";

			if (validadorValor && !validadorValor(b))
				return nome + " com valor inválido: " + linhas[i];

			// Não existe um índice para o par de campos fieldid/charvalue, apenas para o campo fieldid...
			if (!(await sql.scalar("select 1 from mdl_customfield_data where fieldid = ? and charvalue = ? limit 1", [id, a])))
				alertas.push(a);
		}
	}

	return (alertas.length ? alertas : null);
};
