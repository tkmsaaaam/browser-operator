import { execSync } from 'child_process';

export const getPassword = (account: string): string | Error => {
	const password = execSync(
		`security find-generic-password -s RAKUTEN_CARD -a ${account} -w`,
	);
	if (password.toString().startsWith('security:')) {
		return new Error('password can not find.');
	}
	return password.toString().trimEnd();
};
