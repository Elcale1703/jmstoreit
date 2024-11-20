"use server";

import { InputFile } from "node-appwrite/file";
import { createAdminClient } from "../appwrite";
import { appwriteConfig } from "../appwrite/config";
import { ID, Models, Query } from "node-appwrite";
import { constructFileUrl, getFileType, parseStringify } from "../utils";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./user.actions";

const handleError = (error: unknown, message: string) => {
    console.log(error, message);
    throw error;
};

export const uploadFile = async ({ file, ownerId, accountId, path }: UploadFileProps) => {

    const { storage, database } = await createAdminClient();

    try {
        const inputFile = InputFile.fromBuffer(file, file.name);
        const bucketFile = await storage.createFile(
            appwriteConfig.bucketId,
            ID.unique(),
            inputFile,
        );

        const fileDocument = {
            type: getFileType(bucketFile.name).type,
            name: bucketFile.name,
            url: constructFileUrl(bucketFile.$id),
            extension: getFileType(bucketFile.name).extension,
            size: bucketFile.sizeOriginal,
            owner: ownerId,
            accountId,
            users: [],
            bucketFileId: bucketFile.$id,
        };

        const newFile = await database.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.filescollectionId,
            ID.unique(),
            fileDocument,
        )
            .catch(async (error: unknown) => {
                await storage.deleteFile(
                    appwriteConfig.bucketId,
                    bucketFile.$id
                );
                handleError(error, "Failed to create file document");
            });
        revalidatePath(path);
        return parseStringify(newFile);
    } catch (error) {
        handleError(error, "Failed to upload file");
    }
}

const createQueries = (currentUser: Models.Document, types: string[], searchText: string, sort: string, limit?: number) => {
    const queries = [
        Query.or([
            Query.equal("owner", [currentUser.$id]),
            Query.contains("users", [currentUser.email]),
        ])
    ];

    if (types.length > 0) queries.push(Query.equal("type", types));
    if (searchText) queries.push(Query.contains("name", searchText));
    if (limit) queries.push(Query.limit(limit));

    if (sort) {
        const [sortBy, orderBy] = sort.split("-");

        queries.push(orderBy === "asc" ? Query.orderAsc(sortBy) : Query.orderDesc(sortBy));
    }

    return queries;
}

export const getFiles = async ({ types = [], searchText = "", sort = "$createdAt-desc", limit }: GetFilesProps) => {
    const { database } = await createAdminClient();

    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) throw new Error("No user found");

        const queries = createQueries(currentUser, types, searchText, sort, limit);

        const files = await database.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.filescollectionId,
            queries
        );

        return parseStringify(files);
    } catch (error) {
        handleError(error, "Failed to get files");
    }
}

export const renameFile = async ({ fileId, name, extension, path }: RenameFileProps) => {
    const { database } = await createAdminClient();
    try {
        const newName = `${name}.${extension}`;
        const updateFile = await database.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.filescollectionId,
            fileId,
            {
                name: newName,
            },
        );

        revalidatePath(path);
        return parseStringify(updateFile);
    } catch (error) {
        handleError(error, "Failed to rename file");
    }
};

export const updateFileUsers = async ({ fileId, emails, path }: UpdateFileUsersProps) => {
    const { database } = await createAdminClient();
    try {
        const updateFile = await database.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.filescollectionId,
            fileId,
            {
                users: emails,
            },
        );

        revalidatePath(path);
        return parseStringify(updateFile);
    } catch (error) {
        handleError(error, "Failed to rename file");
    }
};

export const deleteFile = async ({ fileId, bucketFileId, path }: DeleteFileProps) => {
    const { database, storage } = await createAdminClient();
    try {
        const deletedFile = await database.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.filescollectionId,
            fileId,
        );

        if (deletedFile) {
            await storage.deleteFile(
                appwriteConfig.bucketId,
                bucketFileId
            );
        };

        revalidatePath(path);
        return parseStringify({ status: "sucess" });
    } catch (error) {
        handleError(error, "Failed to rename file");
    }
};