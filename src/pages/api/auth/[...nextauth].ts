import NextAuth from "next-auth";
import Providers from "next-auth/providers";
import { Get, Index, Lambda, Match, Paginate, query as q, Var } from "faunadb";

import { fauna } from "../../../services/fauna";

export default NextAuth({
  jwt: {
    signingKey: process.env.JWT_SIGNING_KEY,
  },
  // Configure one or more authentication providers
  providers: [
    Providers.GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      scope: "read:user",
    }),
    // ...add more providers here
  ],
  callbacks: {
    async signIn(user, account, profile) {
      // console.log("user:", user);
      const { email } = user;
      try {
        const userExist = await fauna.query(
          q.Map(
            Paginate(Match(Index("user_by_email"), email)),
            Lambda("X", Get(Var("X")))
          )
        );
        if (!userExist) {
          await fauna.query(
            q.Create(q.Collection("users"), { data: { email } })
          );
        }
        return true;
      } catch (error) {
        return false;
      }
    },
  },

  // A database is optional, but required to persist accounts in a database
  // database: process.env.DATABASE_URL,
});
