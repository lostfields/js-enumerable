﻿import { 
    ExpressionVisitor,
    IExpression, Expression, ExpressionType,
    ILambdaExpression, LambdaExpression,
    ILiteralExpression, LiteralExpression,
    ICompoundExpression,
    IIdentifierExpression, IdentifierExpression,
    IMemberExpression, MemberExpression,
    IMethodExpression, MethodExpression,
    IUnaryExpression, UnaryExpression, UnaryOperatorType, UnaryAffixType,
    IBinaryExpression, BinaryExpression, BinaryOperatorType,
    ILogicalExpression, LogicalExpression, LogicalOperatorType,
    IConditionalExpression, ConditionalExpression,
    IArrayExpression, ArrayExpression,
    IIndexExpression, IndexExpression,
    ITemplateLiteralExpression, TemplateLiteralExpression,
    IObjectExpression, ObjectExpression, IObjectProperty 
} from './expressionvisitor'

export class ReducerVisitor extends ExpressionVisitor {
    private _parentExpressionStack: Array<IExpression> = [];

    constructor() {
        super()
    }


    public parseLambda(lambda: string, ...params: Array<any>): IExpression
    public parseLambda(lambda: (it: Record<string, any>, ...params: Array<any>) => any, ...params: Array<any>): IExpression
    public parseLambda(lambda: any, ...params: Array<any>): IExpression {
        let expr = super.parseLambda(arguments[0]),
            scope: Record<string, any> = {}, 
            scopeName: string = null

        if(expr.type == ExpressionType.Lambda) {
            for(let idx = 0; idx < (<ILambdaExpression>expr).parameters.length; idx++) {
                let param = (<ILambdaExpression>expr).parameters[idx]

                if(param.type == ExpressionType.Identifier) {
                    if(idx == 0) {
                        scopeName = (<IIdentifierExpression>param).name
                    }
                    else {
                        if(idx <= params.length) {
                            scope[(<IIdentifierExpression>param).name] = params[idx - 1]
                        }
                    }
                }
            }

            let reduced = this.evaluate((<ILambdaExpression>expr).expression, scope)

            expr = reduced.type == ExpressionType.Literal ? reduced : new LambdaExpression((<ILambdaExpression>expr).parameters, reduced)
        }

        return expr
    }

    public visitLiteral(expression: ILiteralExpression): IExpression {
        return this.evaluate(expression)
    }

    public visitMethod(expression: IMethodExpression): IExpression {
        let expr: IMethodExpression,
            value: any

        expr = new MethodExpression(expression.name, expression.parameters.map((arg) => arg.accept(this)), expression.caller)

        return expr
    }

    public visitBinary(expression: IBinaryExpression): IExpression {
        let left = expression.left,
            right = expression.right 

        if(left.type == ExpressionType.Literal && right.type == ExpressionType.Literal) {
            let leftValue = (<LiteralExpression>left).value,
                rightValue = (<LiteralExpression>right).value

            switch(expression.operator) {
                case BinaryOperatorType.Addition:
                    return new LiteralExpression(leftValue + rightValue)

                case BinaryOperatorType.Subtraction:
                    return new LiteralExpression(leftValue - rightValue)

                case BinaryOperatorType.Multiplication:
                    return new LiteralExpression(leftValue * rightValue)

                case BinaryOperatorType.Division:
                    return new LiteralExpression(leftValue / rightValue)

                case BinaryOperatorType.Modulus:
                    return new LiteralExpression(leftValue % rightValue)

                case BinaryOperatorType.And:
                    return new LiteralExpression(leftValue & rightValue)

                case BinaryOperatorType.Or:
                    return new LiteralExpression(leftValue | rightValue)

                case BinaryOperatorType.ExclusiveOr:
                    return new LiteralExpression(leftValue ^ rightValue)

                case BinaryOperatorType.LeftShift:
                    return new LiteralExpression(leftValue << rightValue)

                case BinaryOperatorType.RightShift:
                    return new LiteralExpression(leftValue >> rightValue)
            }
        }

        return new BinaryExpression(expression.operator, left.accept(this), right.accept(this))
    }

    public visitConditional(expression: IConditionalExpression): IExpression {
        let condition = expression.condition.accept(this)

        if(condition.type == ExpressionType.Literal) {
            if((<LiteralExpression>condition).value === true)
                return expression.success.accept(this)
            else
                return expression.failure.accept(this)
        }

        return new ConditionalExpression(condition, expression.success.accept(this), expression.failure.accept(this))
    }

    public visitLogical(expression: ILogicalExpression): IExpression {
        let left = expression.left.accept(this),
            right = expression.right.accept(this)

        if(left.type == ExpressionType.Literal && right.type == ExpressionType.Literal) {
            let leftValue = (<LiteralExpression>left).value,
                rightValue = (<LiteralExpression>right).value

            switch(expression.operator) {
                case LogicalOperatorType.Equal:
                    return new LiteralExpression(leftValue >= rightValue && leftValue <= rightValue) // fixes date comparements
                case LogicalOperatorType.NotEqual:
                    return new LiteralExpression(leftValue < rightValue || leftValue > rightValue) // fixes date comparements
                case LogicalOperatorType.And:
                    return new LiteralExpression(leftValue && rightValue)
                case LogicalOperatorType.Or:
                    return new LiteralExpression(leftValue || rightValue)
                case LogicalOperatorType.Greater:
                    return new LiteralExpression(leftValue > rightValue)
                case LogicalOperatorType.GreaterOrEqual:
                    return new LiteralExpression(leftValue >= rightValue)
                case LogicalOperatorType.Lesser:
                    return new LiteralExpression(leftValue < rightValue)
                case LogicalOperatorType.LesserOrEqual:
                    return new LiteralExpression(leftValue <= rightValue)
            }
        }

        switch(expression.operator) {
            case LogicalOperatorType.And:
                if(left.type == ExpressionType.Literal && (<LiteralExpression>left).value === true) return right
                if(right.type == ExpressionType.Literal && (<LiteralExpression>right).value === true) return left

                break

            case LogicalOperatorType.Or:
                if(left.type == ExpressionType.Literal && (<LiteralExpression>left).value === true) return left
                if(right.type == ExpressionType.Literal && (<LiteralExpression>right).value === true) return right

                break
        }

        return new LogicalExpression(expression.operator, left, right)
    }

    public evaluate(expression: IExpression, scope?: Record<string, any> | number | string, scopeName?: string): IExpression 
    public evaluate(expression: IExpression, scope: Record<string, any> | number | string = null, scopeName: string = null): IExpression {
        if(expression == null)
            return null

        let value: any = null
            

        

        switch(expression.type) {
            case ExpressionType.Lambda:
                let parameter = (<ILambdaExpression>expression).parameters[0] ?? null

                if(parameter?.type == ExpressionType.Identifier) {
                    scopeName = (<IIdentifierExpression>parameter).name
                }

                let result = this.evaluate((<ILambdaExpression>expression).expression, scope, scopeName)
                
                return result.type == ExpressionType.Literal ? result : new LambdaExpression((<ILambdaExpression>expression).parameters, result)

            case ExpressionType.Literal:
                break

            case ExpressionType.Identifier: {
                let identifier = (<IIdentifierExpression>expression)

                if(scope != null) {
                    // this object
                    if(isRecord(scope) && identifier.name in scope && (value = scope[identifier.name]) !== undefined) {
                        if(value == null)
                            return new LiteralExpression(null)

                        switch(typeof value) {
                            case 'string':
                            case 'number':
                            case 'boolean':
                                break
                        
                            case 'object':
                                if(value.getTime && value.getTime() >= 0)
                                    break

                                if(Array.isArray(value) == true)
                                    break // hmm, literal value as array?

                                value = null
                                break

                            default:
                                value = null
                                break
                        }

                        return new LiteralExpression(value)
                    }
                    else if(['number', 'string'].includes(typeof scope)) {
                        return new LiteralExpression(scope)
                    }
                }

                break
            }

            case ExpressionType.Array:
                return new ArrayExpression((<IArrayExpression>expression).elements.map(v => this.evaluate(v, scope, scopeName)))

            case ExpressionType.Object:
                return new ObjectExpression((<IObjectExpression>expression).properties.map(el => <IObjectProperty>{ key: this.evaluate(el.key, scope, scopeName), value: this.evaluate(el.value, scope, scopeName) }))

            case ExpressionType.Index: {
                let object = this.evaluate((<IIndexExpression>expression).object, scope, scopeName),
                    index = this.evaluate((<IIndexExpression>expression).index, scope, scopeName)

                if(index.type == ExpressionType.Literal)
                    switch(object.type) {
                        case ExpressionType.Object: 
                            let property = (<IObjectExpression>object).properties.find(prop => {
                                switch(prop.key.type) {
                                    case ExpressionType.Identifier:
                                        if((<IIdentifierExpression>prop.key).name == (<ILiteralExpression>index).value)
                                            return true
                                        break

                                    case ExpressionType.Literal:
                                        if((<ILiteralExpression>prop.key).value == (<ILiteralExpression>index).value)
                                            return true
                                        break
                                }

                                return false
                            })
                            return property ? this.evaluate(property.value, scopeName) : new LiteralExpression(null)

                        case ExpressionType.Array:
                            return Array.from((<IArrayExpression>object).elements)[(<ILiteralExpression>index).value]
                            
                        case ExpressionType.Literal:
                            if(typeof (<ILiteralExpression>object).value == 'object') {
                                if(Array.isArray((<ILiteralExpression>object).value)) {
                                    return new LiteralExpression(Array.from((<ILiteralExpression>object).value)[(<ILiteralExpression>index).value])
                                }
                                
                                let descriptor: PropertyDescriptor
                                if(descriptor = Object.getOwnPropertyDescriptor((<ILiteralExpression>object).value, (<ILiteralExpression>index).value))
                                    return new LiteralExpression(descriptor.value)
                            }
                            
                            return new LiteralExpression(null)                            
                    }

                break
            }

            case ExpressionType.Member: {
                let object = (<IMemberExpression>expression).object,
                    property = (<IMemberExpression>expression).property

                if(scope != null) {
                    if(object.type == ExpressionType.Identifier) {
                        if((<IIdentifierExpression>object).name == 'this' || (<IIdentifierExpression>object).name == scopeName) {
                            value = this.evaluate(property, scope, scopeName)
                            if(property.equal(value) == false)
                                return value
                        }
                        else {
                            let descriptor = Object.getOwnPropertyDescriptor(scope, (<IIdentifierExpression>object).name)
                            if(descriptor && typeof descriptor.value == 'object') {
                                value = this.evaluate(property, descriptor.value, scopeName)
                                if(property.equal(value) == false)
                                    return value
                            }
                        }
                    }
                }

                break
            }

            case ExpressionType.Conditional:
                return this.visit(new ConditionalExpression(this.evaluate((<IConditionalExpression>expression).condition, scope, scopeName), this.evaluate((<IConditionalExpression>expression).success, scope, scopeName), this.evaluate((<IConditionalExpression>expression).failure, scope, scopeName)))

            case ExpressionType.Logical:
                return this.visit(new LogicalExpression((<ILogicalExpression>expression).operator, this.evaluate((<ILogicalExpression>expression).left, scope, scopeName), this.evaluate((<ILogicalExpression>expression).right, scope, scopeName)))

            case ExpressionType.Binary:
                return this.visit(new BinaryExpression((<IBinaryExpression>expression).operator, this.evaluate((<IBinaryExpression>expression).left, scope, scopeName), this.evaluate((<IBinaryExpression>expression).right, scope, scopeName)))

            case ExpressionType.Method:
                return this.visit(new MethodExpression((<IMethodExpression>expression).name, (<IMethodExpression>expression).parameters.map(p => this.evaluate(p, scope, scopeName)), this.evaluate((<IMethodExpression>expression).caller, scope, scopeName)))
            
            default:
                let o = <IExpression>Object.create(Object.getPrototypeOf(expression), Object.getOwnPropertyNames(expression).reduce<Record<string, any>>((prev, cur) => {
                    let prop = Object.getOwnPropertyDescriptor(expression, cur)

                    if(prop.value instanceof Expression)
                        prop.value = this.evaluate(prop.value, scope, scopeName)
                    else if(prop.value instanceof Array)
                        prop.value = prop.value.map(a => a instanceof Expression ? this.evaluate(a, scope, scopeName) : a)

                    prev[cur] = prop

                    return prev
                }, {}))

                return this.visit(o)
        }

        return expression
    }

    public static evaluate(expression: IExpression, scope: Record<string, any> = null, scopeName: string = null): any {
        let reducer = new ReducerVisitor(),
            result = reducer.evaluate(expression, scope, scopeName)

        return result.type == ExpressionType.Literal ? (<ILiteralExpression>result).value : undefined
    }

    //private getInputParameters(): {} {
    //    if (this._lambdaExpression && this._lambdaExpression.parameters.length > 0)
    //        return this._lambdaExpression.parameters.reduce((res, val, index) => {
    //            if (index > 0 && index <= this._params.length)
    //                res[val] = this._params[index - 1]

    //            return res;
    //        }, {})

    //    return {}
    //}
}

function isRecord(value: Record<string, any> | any): value is Record<string, any> {
    return value !== null && typeof value == 'object' && value.getTime === undefined
}