import { execSync } from 'child_process';

export const getPassword = (account: string): string | undefined => {
	const env = process.env.PASSWORD;
	if (env) {
		return env;
	}
	const password = execSync(
		`security find-generic-password -s RAKUTEN_SEC -a ${account} -w`,
	);
	if (password.toString().startsWith('security:')) {
		return undefined;
	}
	return password.toString().trimEnd();
};
