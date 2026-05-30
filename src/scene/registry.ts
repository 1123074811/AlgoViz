import { arrayCompiler } from './compilers/arrayCompiler'
import { graphCompiler } from './compilers/graphCompiler'
import { linkedListCompiler } from './compilers/linkedListCompiler'
import { matrixCompiler } from './compilers/matrixCompiler'
import { queueCompiler } from './compilers/queueCompiler'
import { stackCompiler } from './compilers/stackCompiler'
import { stringCompiler } from './compilers/stringCompiler'
import { treeCompiler } from './compilers/treeCompiler'

export const sceneCompilers = [linkedListCompiler, treeCompiler, arrayCompiler, matrixCompiler, graphCompiler, stackCompiler, queueCompiler, stringCompiler]
