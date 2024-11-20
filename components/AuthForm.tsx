"use client"

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createAccount, signInUser } from "@/lib/actions/user.actions";
import OTPModal from "./OTPModal";

const authFormSchema = (formType: FormType) => {
    return z.object({
        Email: z.string().email(),
        FullName: formType === "sign-up" ? z.string().min(2).max(50) : z.string().optional(),
    })
}

type FormType = "sign-in" | "sign-up";

const AuthForm = ({ type }: { type: FormType }) => {

    const formSchema = authFormSchema(type);

    const [isLoading, setIsLoading] = useState(false);

    const [errorMessage, setErrorMessage] = useState("");

    const [accountId, setAccountId] = useState(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            FullName: "",
            Email: "",
        },
    })

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true);
        setErrorMessage("");
        try {
            const user =
                type === "sign-up"
                    ?
                    await createAccount({ fullName: values.FullName || "", email: values.Email }) :
                    await signInUser({ email: values.Email })
            setAccountId(user.accountId);
        } catch {
            setErrorMessage("Failed to create account. Please try again.");
        } finally {
            setIsLoading(false);
        }

    }
    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="auth-form">
                    <h1 className="form-title">
                        {type === "sign-in" ? "Sign In" : "Sign Up"}
                    </h1>
                    {type === "sign-up" && (
                        <FormField
                            control={form.control}
                            name="FullName"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="shad-form-item">
                                        <FormLabel className="shad-form-label">Nombre Completo</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Escribe tu nombre completo" className="shad-input" {...field} />
                                        </FormControl>
                                    </div>
                                    <FormMessage className="shad-form-message" />
                                </FormItem>
                            )}
                        />
                    )}
                    <FormField
                        control={form.control}
                        name="Email"
                        render={({ field }) => (
                            <FormItem>
                                <div className="shad-form-item">
                                    <FormLabel className="shad-form-label">Correo electronico</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Escribe tu Correo Electronico" className="shad-input" {...field} />
                                    </FormControl>
                                </div>
                                <FormMessage className="shad-form-message" />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="form-submit-button" disabled={isLoading}>
                        {type === "sign-in" ? "Iniciar Sesion" : "Crear Cuenta"}

                        {isLoading && (
                            <Image src="/assets/icons/loader.svg" alt="loader" width={24} height={24} className="ml-2 animate-spin" />
                        )}
                    </Button>
                    {errorMessage && (
                        <p className="error-message">
                            *{errorMessage}
                        </p>
                    )}
                    <div className="body-2 flex justify-center">
                        <p className="text-light-100">
                            {type === "sign-in" ? "No tienes una cuenta?" : "Ya tienes una cuenta?"}
                        </p>
                        <Link href={type === "sign-in" ? "/sign-up" : "/sign-in"} className="ml-1 font-medium text-brand">
                            {type === "sign-in" ? "Crear una cuenta" : "Iniciar Sesion"}
                        </Link>
                    </div>
                </form>
            </Form>
            {accountId && <OTPModal email={form.getValues("Email")} accountId={accountId} />}
        </>
    );
};

export default AuthForm;
