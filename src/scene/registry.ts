import { arrayCompiler } from './compilers/arrayCompiler'
import { graphCompiler } from './compilers/graphCompiler'
import { linkedListCompiler } from './compilers/linkedListCompiler'
import { matrixCompiler } from './compilers/matrixCompiler'
import { treeCompiler } from './compilers/treeCompiler'

export const sceneCompilers = [linkedListCompiler, treeCompiler, arrayCompiler, matrixCompiler, graphCompiler]
