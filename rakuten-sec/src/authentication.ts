import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
dotenv.config();

export const getPassword = (account: string): string | undefined => {
	const password = execSync(
		`security find-generic-password -s RAKUTEN_SEC -a ${account} -w`
	);
	if (password.toString().startsWith('security:')) {
		return undefined;
	}
	return password.toString().trimEnd();
};