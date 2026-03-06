declare module "next-auth/providers/credentials" {
  const CredentialsProvider: (config: unknown) => unknown;
  export default CredentialsProvider;
}
