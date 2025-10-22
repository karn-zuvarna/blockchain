import Fasify from "fastify";
import cors from "@fastify/cors";
import { deploy } from "./libs/deploy.ts";
import { mint } from "./libs/mint.ts";
import { freeze } from "./libs/freeze.ts";
import { unfreeze } from "./libs/unfreeze.ts";
import { burn } from "./libs/burn.ts";

const app = Fasify({
    logger: true,
});
await app.register(cors, {
    origin: true
})

app.post("/deploy", async (req, reply) => {
    const token = await deploy();
    return reply.code(201).send(token);
});
app.post("/mint", async (req, reply) => {
    const body = req.body as { to: string, amount: string };
    console.log("mint to:", body.to);
    console.log("mint amount:", body.amount);
    const result = await mint(body.to, body.amount);
    return reply.code(201).send(body);
});
app.post("/burn", async (req, reply) => {
    const body = req.body as { who: string, amount: string };
    console.log("burn account:", body.who);
    console.log("burn amount:", body.amount);
    const result = await burn( body.amount, body.who,);
    return reply.code(201).send(body);
});
app.post("/freeze", async (req, reply) => {
    const body = req.body as { who: string };
    console.log("freeze account:", body.who);
    const result = await freeze(body.who);
    return reply.code(201).send(body);
});
app.post("/unfreeze", async (req, reply) => {
    const body = req.body as { who: string };
    console.log("unfreeze account:", body.who);
    const result = await unfreeze(body.who);
    return reply.code(201).send(body);
});

try {
    await app.listen({port:1323});
} catch (err) {
    app.log.error(err);
    process.exit(1);
}