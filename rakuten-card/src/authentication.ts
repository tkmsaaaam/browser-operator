import { execSync } from 'child_process';

export const getPassword = (account: string): string | undefined => {
	const password = execSync(
		`security find-generic-password -s RAKUTEN_CARD -a ${account} -w`,
	);
	if (password.toString().startsWith('security:')) {
		return undefined;
	}
	return password.toString().trimEnd();
};
